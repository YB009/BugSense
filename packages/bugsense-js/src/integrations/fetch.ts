import type { BugSense, CaptureExceptionContext } from '../core/BugSense';

export interface FetchInstrumentationOptions {
  ignoreUrls?: Array<string | RegExp>;
}

export interface FetchInstrumentationCleanup {
  stop(): void;
}

type FetchFunction = typeof fetch;

export function installFetchInstrumentation(
  bugsense: BugSense,
  options: FetchInstrumentationOptions = {},
): FetchInstrumentationCleanup {
  if (typeof globalThis.fetch !== 'function') {
    return {
      stop() {},
    };
  }

  const originalFetch = globalThis.fetch.bind(globalThis) as FetchFunction;
  const ignoredMatchers = [
    bugsense.getOptions().endpoint,
    ...(options.ignoreUrls ?? []),
  ];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestMetadata = getRequestMetadata(input, init);

    if (shouldIgnoreUrl(requestMetadata.url, ignoredMatchers)) {
      return originalFetch(input, init);
    }

    try {
      const response = await originalFetch(input, init);

      if (!response.ok) {
        await bugsense.captureException(
          createFetchCaptureError({
            requestMetadata,
            response,
          }),
          buildContext({
            source: 'fetch',
            requestMetadata,
            response,
          }),
        );
      }

      return response;
    } catch (error) {
      await bugsense.captureException(
        createFetchCaptureError({
          requestMetadata,
        }),
        buildContext({
          source: 'fetch',
          requestMetadata,
        }),
      );

      throw error;
    }
  }) as FetchFunction;

  return {
    stop() {
      globalThis.fetch = originalFetch;
    },
  };
}

function buildContext({
  source,
  requestMetadata,
  response,
}: {
  source: string;
  requestMetadata: RequestMetadata;
  response?: Pick<Response, 'status' | 'statusText'>;
}): CaptureExceptionContext {
  const tags: Record<string, string> = {
    source,
  };

  if (requestMetadata.method) {
    tags.method = requestMetadata.method;
  }

  if (response) {
    tags.statusCode = String(response.status);
  }

  tags.status = response ? getResponseStatusLabel(response) : 'CORS/Network';

  return {
    tags,
    metadata: {
      url: requestMetadata.url,
      fullUrl: requestMetadata.url,
      baseURL: getBaseUrl(requestMetadata.url),
      method: requestMetadata.method,
      status: response?.status,
      statusLabel: response ? getResponseStatusLabel(response) : 'CORS/Network',
      statusText: response?.statusText,
    },
  };
}

interface RequestMetadata {
  url: string;
  method: string;
}

function getRequestMetadata(
  input: RequestInfo | URL,
  init?: RequestInit,
): RequestMetadata {
  const fallbackMethod = init?.method?.toUpperCase() ?? 'GET';

  if (typeof Request !== 'undefined' && input instanceof Request) {
    return {
      url: input.url,
      method: init?.method?.toUpperCase() ?? input.method.toUpperCase(),
    };
  }

  if (input instanceof URL) {
    return {
      url: input.toString(),
      method: fallbackMethod,
    };
  }

  if (typeof input === 'string') {
    return {
      url: input,
      method: fallbackMethod,
    };
  }

  return {
    url: String(input),
    method: fallbackMethod,
  };
}

function shouldIgnoreUrl(url: string, matchers: Array<string | RegExp>) {
  return matchers.some((matcher) => {
    if (typeof matcher === 'string') {
      return matcher.length > 0 && url.startsWith(matcher);
    }

    return matcher.test(url);
  });
}

function createFetchCaptureError({
  requestMetadata,
  response,
}: {
  requestMetadata: RequestMetadata;
  response?: Pick<Response, 'status' | 'statusText'>;
}) {
  const captureError = new Error(
    `${requestMetadata.method} ${getDisplayPath(requestMetadata.url)} - ${
      response ? getResponseStatusLabel(response) : 'CORS/Network'
    }`,
  );
  captureError.name = 'FetchError';
  return captureError;
}

function getResponseStatusLabel(response: Pick<Response, 'status' | 'statusText'>) {
  const statusText = response.statusText?.trim();
  return statusText ? `${response.status} ${statusText}` : String(response.status);
}

function getDisplayPath(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function getBaseUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return undefined;
  }
}
