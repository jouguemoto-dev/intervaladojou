// Background Web Worker for bulletproof timer execution
// Browsers throttle setInterval/setTimeout to 1s or freeze them completely when screen locks or tab loses focus.
// Web Workers run in a distinct background thread and are NOT throttled by screen lock.
// This worker uses self-correcting drift compensation based on performance.now() / Date.now()
// so even if the operating system throttles thread ticks, the worker immediately catches up.

var timerId = null;
var expectedTickTime = 0;
var targetInterval = 1000;

function scheduleNextTick() {
  if (timerId === null) return;
  var now = Date.now();
  var drift = now - expectedTickTime;
  // If next tick is already in the past due to heavy OS throttling, fire immediately
  var nextDelay = Math.max(0, targetInterval - drift);

  timerId = setTimeout(function () {
    if (timerId === null) return;
    expectedTickTime += targetInterval;
    self.postMessage({ type: 'tick', timestamp: Date.now() });
    scheduleNextTick();
  }, nextDelay);
}

self.onmessage = function (event) {
  var data = event.data || {};
  var command = data.command;
  targetInterval = data.interval || 1000;

  if (command === 'start') {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    expectedTickTime = Date.now() + targetInterval;
    scheduleNextTick();
  } else if (command === 'stop') {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }
};
