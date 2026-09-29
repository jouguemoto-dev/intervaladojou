// Background Web Worker for bulletproof timer execution
// Browsers throttle setInterval/setTimeout to 1s or freeze them completely when screen locks or tab loses focus.
// Web Workers run in a distinct background thread and are NOT throttled by screen lock, ensuring exact 1000ms ticks.

let timerId: any = null;

self.onmessage = (event: MessageEvent) => {
  const { command, interval = 1000 } = event.data;

  if (command === 'start') {
    if (timerId !== null) {
      clearInterval(timerId);
    }
    timerId = setInterval(() => {
      self.postMessage({ type: 'tick', timestamp: Date.now() });
    }, interval);
  } else if (command === 'stop') {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};
