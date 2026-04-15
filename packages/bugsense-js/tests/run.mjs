import assert from 'node:assert/strict';

import {
  BugSense,
  ErrorCollector,
  HttpTransport,
  instrumentAxios,
} from '../dist/index.js';

const tests = [
  [
    'ErrorCollector.collectWindowError preserves explicit message and metadata',
    testCollectWindowError,
  ],
  [
    'BugSense captures window.onerror payloads and restores previous handlers on stop',
    testWindowOnErrorCapture,
  ],
  [
    'BugSense captures unhandled promise rejections',
    testUnhandledRejectionCapture,
  ],
  [
    'HttpTransport flushes immediately when the batch threshold is reached',
    testFlushOnThreshold,
  ],
  [
    'HttpTransport flushes queued events on the timer interval',
    testFlushOnInterval,
  ],
  [
    'HttpTransport requeues failed payloads and retries them on the next flush',
    testRequeueOnFailure,
  ],
  [
    'HttpTransport reports failures when fetch is unavailable',
    testFetchUnavailable,
  ],
  [
    'BugSense auto-instruments fetch and captures handled network failures',
    testFetchInstrumentation,
  ],
  [
    'instrumentAxios captures rejected Axios responses',
    testAxiosInstrumentation,
  ],
];

let failed = 0;

for (const [name, fn] of tests) {
  try {
    await fn();
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    failed += 1;
    process.stderr.write(`FAIL ${name}\n`);
    process.stderr.write(`${formatError(error)}\n`);
  }
}

if (failed > 0) {
  process.stderr.write(`\n${failed} test(s) failed.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`\n${tests.length} test(s) passed.\n`);
}

function formatError(error) {
  if (error instanceof Error && error.stack) {
    return error.stack;
  }

  return String(error);
}

async function testCollectWindowError() {
  const collector = new ErrorCollector();
  const error = new TypeError('collector fallback message');
  error.stack = 'TypeError: collector fallback message\n    at example.js:10:5';

  const collected = collector.collectWindowError(
    'window exploded',
    'https://example.com/app.js',
    12,
    34,
    error,
  );

  assert.equal(collected.message, 'window exploded');
  assert.equal(collected.exceptionType, 'TypeError');
  assert.equal(collected.stackTrace, error.stack);
  assert.deepEqual(collected.metadata, {
    source: 'https://example.com/app.js',
    lineno: 12,
    colno: 34,
  });
}

async function testWindowOnErrorCapture() {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const deliveredPayloads = [];
  const previousOnErrorCalls = [];
  const previousOnError = (...args) => {
    previousOnErrorCalls.push(args);
    return true;
  };

  globalThis.fetch = async (_url, init) => {
    deliveredPayloads.push(JSON.parse(init.body));
    return { ok: true };
  };

  globalThis.window = {
    onerror: previousOnError,
    onunhandledrejection: null,
  };

  try {
    const bugsense = new BugSense({
      apiKey: 'key_dev_123',
      endpoint: 'http://localhost:3000/ingest',
      projectId: 'proj_123',
      environment: 'test',
      release: 'v1.0.0',
      maxBatchSize: 1,
      flushIntervalMs: 1000,
    });

    const boom = new Error('boom');
    boom.stack = 'Error: boom\n    at app.js:1:1';

    const returnValue = globalThis.window.onerror(
      'window boom',
      'https://example.com/app.js',
      7,
      9,
      boom,
    );

    await tick();

    assert.equal(returnValue, true);
    assert.equal(previousOnErrorCalls.length, 1);
    assert.equal(deliveredPayloads.length, 1);
    assert.equal(deliveredPayloads[0].projectId, 'proj_123');
    assert.equal(deliveredPayloads[0].message, 'window boom');
    assert.equal(deliveredPayloads[0].exceptionType, 'Error');
    assert.equal(deliveredPayloads[0].environment, 'test');
    assert.equal(deliveredPayloads[0].releaseVersion, 'v1.0.0');
    assert.deepEqual(deliveredPayloads[0].metadata, {
      source: 'https://example.com/app.js',
      lineno: 7,
      colno: 9,
    });

    const registeredHandler = globalThis.window.onerror;
    bugsense.stop();

    assert.equal(globalThis.window.onerror, previousOnError);
    assert.notEqual(registeredHandler, globalThis.window.onerror);
  } finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
}

async function testUnhandledRejectionCapture() {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const deliveredPayloads = [];

  globalThis.fetch = async (_url, init) => {
    deliveredPayloads.push(JSON.parse(init.body));
    return { ok: true };
  };

  globalThis.window = {
    onerror: null,
    onunhandledrejection: null,
  };

  try {
    const bugsense = new BugSense({
      apiKey: 'key_dev_123',
      endpoint: 'http://localhost:3000/ingest',
      projectId: 'proj_123',
      maxBatchSize: 1,
      flushIntervalMs: 1000,
    });

    const rejection = new TypeError('promise rejected');
    rejection.stack = 'TypeError: promise rejected\n    at app.js:2:3';

    await globalThis.window.onunhandledrejection({ reason: rejection });
    await tick();

    assert.equal(deliveredPayloads.length, 1);
    assert.equal(deliveredPayloads[0].message, 'promise rejected');
    assert.equal(deliveredPayloads[0].exceptionType, 'TypeError');

    bugsense.stop();
  } finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
}

async function testFlushOnThreshold() {
  const originalFetch = globalThis.fetch;
  const requests = [];

  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(init.body));
    return { ok: true };
  };

  try {
    const transport = new HttpTransport({
      endpoint: 'http://localhost:3000/ingest',
      apiKey: 'key_dev_123',
      maxBatchSize: 2,
      flushIntervalMs: 1000,
    });

    const first = await transport.send({ id: 1 });
    const second = await transport.send({ id: 2 });

    assert.deepEqual(first, { enqueued: true, queueSize: 1 });
    assert.deepEqual(second, { delivered: true, sent: 2, failed: 0 });
    assert.deepEqual(requests, [{ id: 1 }, { id: 2 }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testFlushOnInterval() {
  const originalFetch = globalThis.fetch;
  const requests = [];

  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(init.body));
    return { ok: true };
  };

  try {
    const transport = new HttpTransport({
      endpoint: 'http://localhost:3000/ingest',
      apiKey: 'key_dev_123',
      maxBatchSize: 10,
      flushIntervalMs: 20,
    });

    const result = await transport.send({ id: 1 });

    assert.deepEqual(result, { enqueued: true, queueSize: 1 });
    await delay(40);

    assert.deepEqual(requests, [{ id: 1 }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testRequeueOnFailure() {
  const originalFetch = globalThis.fetch;
  const requests = [];
  let failFirstDelivery = true;

  globalThis.fetch = async (_url, init) => {
    const payload = JSON.parse(init.body);
    requests.push(payload);
    return { ok: !failFirstDelivery };
  };

  try {
    const transport = new HttpTransport({
      endpoint: 'http://localhost:3000/ingest',
      apiKey: 'key_dev_123',
      maxBatchSize: 1,
      flushIntervalMs: 1000,
    });

    const failed = await transport.send({ id: 1 });

    assert.deepEqual(failed, { delivered: false, sent: 0, failed: 1 });
    assert.deepEqual(requests, [{ id: 1 }]);

    failFirstDelivery = false;
    const retried = await transport.flush();

    assert.deepEqual(retried, { delivered: true, sent: 1, failed: 0 });
    assert.deepEqual(requests, [{ id: 1 }, { id: 1 }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testFetchUnavailable() {
  const originalFetch = globalThis.fetch;
  delete globalThis.fetch;

  try {
    const transport = new HttpTransport({
      endpoint: 'http://localhost:3000/ingest',
      apiKey: 'key_dev_123',
      maxBatchSize: 1,
      flushIntervalMs: 1000,
    });

    const result = await transport.send({ id: 1 });

    assert.deepEqual(result, { delivered: false, sent: 0, failed: 1 });
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testFetchInstrumentation() {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const deliveredPayloads = [];

  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('http://localhost:3000/ingest')) {
      deliveredPayloads.push(JSON.parse(init.body));
      return { ok: true, status: 202, statusText: 'Accepted' };
    }

    return { ok: false, status: 503, statusText: 'Service Unavailable' };
  };

  globalThis.window = {
    onerror: null,
    onunhandledrejection: null,
  };

  try {
    const bugsense = new BugSense({
      apiKey: 'key_dev_123',
      endpoint: 'http://localhost:3000/ingest',
      projectId: 'proj_123',
      maxBatchSize: 1,
      flushIntervalMs: 1000,
    });

    const response = await globalThis.fetch('http://localhost:3001/api/projects');

    assert.equal(response.ok, false);
    await tick();

    assert.equal(deliveredPayloads.length, 1);
    assert.equal(
      deliveredPayloads[0].message,
      'GET /api/projects - 503 Service Unavailable',
    );
    assert.equal(deliveredPayloads[0].tags.source, 'fetch');
    assert.equal(deliveredPayloads[0].tags.statusCode, '503');
    assert.equal(deliveredPayloads[0].tags.status, '503 Service Unavailable');
    assert.equal(
      deliveredPayloads[0].metadata.url,
      'http://localhost:3001/api/projects',
    );
    assert.equal(deliveredPayloads[0].metadata.baseURL, 'http://localhost:3001');

    bugsense.stop();
  } finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
}

async function testAxiosInstrumentation() {
  const originalFetch = globalThis.fetch;
  const deliveredPayloads = [];

  globalThis.fetch = async (_url, init) => {
    deliveredPayloads.push(JSON.parse(init.body));
    return { ok: true };
  };

  try {
    const bugsense = new BugSense({
      apiKey: 'key_dev_123',
      endpoint: 'http://localhost:3000/ingest',
      projectId: 'proj_123',
      autoCapture: false,
      maxBatchSize: 1,
      flushIntervalMs: 1000,
    });

    const handlers = [];
    const axiosInstance = {
      interceptors: {
        response: {
          use(_onFulfilled, onRejected) {
            handlers.push(onRejected);
            return handlers.length - 1;
          },
          eject(id) {
            handlers[id] = null;
          },
        },
      },
    };

    const cleanup = instrumentAxios(axiosInstance, bugsense);

    const axiosError = {
      message: 'Request failed with status code 500',
      config: {
        url: 'http://localhost:3001/api/projects',
        method: 'get',
        baseURL: 'http://localhost:3001',
      },
      response: {
        status: 500,
        statusText: 'Internal Server Error',
      },
    };

    await assert.rejects(() => handlers[0](axiosError));
    await tick();

    assert.equal(deliveredPayloads.length, 1);
    assert.equal(
      deliveredPayloads[0].message,
      'GET /api/projects - 500 Internal Server Error',
    );
    assert.equal(deliveredPayloads[0].tags.source, 'axios');
    assert.equal(deliveredPayloads[0].tags.method, 'GET');
    assert.equal(deliveredPayloads[0].tags.statusCode, '500');
    assert.equal(
      deliveredPayloads[0].tags.status,
      '500 Internal Server Error',
    );
    assert.equal(
      deliveredPayloads[0].metadata.url,
      'http://localhost:3001/api/projects',
    );
    assert.equal(deliveredPayloads[0].metadata.baseURL, 'http://localhost:3001');

    cleanup.stop();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function tick() {
  return delay(0);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
