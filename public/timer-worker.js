// Background Web Worker for bulletproof timer execution
// Browsers throttle setInterval/setTimeout to 1s or freeze them completely when screen locks or tab loses focus.
// Web Workers run in a distinct background thread and are NOT throttled by screen lock.
// Uses self-correcting timestamp drift compensation based on Date.now().

var isRunning = false;
var timerId = null;
var expectedTickTime = 0;
var targetInterval = 1000;

function scheduleNextTick() {
  if (!isRunning) return;
  var now = Date.now();
  var nextDelay = Math.max(0, expectedTickTime - now);

  timerId = setTimeout(function () {
    if (!isRunning) return;
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
    isRunning = true;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    expectedTickTime = Date.now() + targetInterval;
    scheduleNextTick();
  } else if (command === 'stop') {
    isRunning = false;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  }
};
