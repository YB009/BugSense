import type { BugSense, CaptureExceptionContext } from '../core/BugSense';

export interface AxiosInstrumentationOptions {
  ignoreUrls?: Array<string | RegExp>;
}

export interface AxiosInstrumentationCleanup {
  stop(): void;
}

export interface AxiosInstanceLike {
  interceptors: {
    response: {
      use(
        onFulfilled?: (value: unknown) => unknown,
        onRejected?: (error: unknown) => unknown,
      ): number;
      eject(id: number): void;
    };
  };
}

interface AxiosErrorLike {
  message?: string;
  config?: {
    url?: string;
    method?: string;
    baseURL?: string;
  };
  response?: {
    status?: number;
    statusText?: string;
  };
}

export function instrumentAxios(
  instance: AxiosInstanceLike,
  bugsense: BugSense,
  options: AxiosInstrumentationOptions = {},
): AxiosInstrumentationCleanup {
  const ignoredMatchers = [
    bugsense.getOptions().endpoint,
    ...(options.ignoreUrls ?? []),
  ];

  const interceptorId = instance.interceptors.response.use(
    (value) => value,
    async (error: unknown) => {
      const axiosError = error as AxiosErrorLike;
      const url = axiosError.config?.url ?? '';

      if (!shouldIgnoreUrl(url, ignoredMatchers)) {
        await bugsense.captureException(
          createAxiosCaptureError(axiosError),
          buildContext(axiosError),
        );
      }

      throw error;
    },
  );

  return {
    stop() {
      instance.interceptors.response.eject(interceptorId);
    },
  };
}

function buildContext(error: AxiosErrorLike): CaptureExceptionContext {
  const method = error.config?.method?.toUpperCase();
  const status = error.response?.status;
  const statusLabel = getStatusLabel(error);
  const fullUrl = getFullUrl(error);

  const tags: Record<string, string> = {
    source: 'axios',
  };

  if (method) {
    tags.method = method;
  }

  if (typeof status === 'number') {
    tags.statusCode = String(status);
  }

  tags.status = statusLabel;

  return {
    tags,
    metadata: {
      url: error.config?.url,
      fullUrl,
      baseURL: error.config?.baseURL,
      method,
      status,
      statusLabel,
      statusText: error.response?.statusText,
    },
  };
}

function createAxiosCaptureError(error: AxiosErrorLike) {
  const captureError = new Error(formatAxiosMessage(error));
  captureError.name = 'AxiosError';
  return captureError;
}

function formatAxiosMessage(error: AxiosErrorLike) {
  const method = error.config?.method?.toUpperCase() ?? 'REQUEST';
  const route = getDisplayPath(error);
  const statusLabel = getStatusLabel(error);

  return `${method} ${route} - ${statusLabel}`;
}

function getStatusLabel(error: AxiosErrorLike) {
  if (typeof error.response?.status === 'number') {
    const statusText = error.response.statusText?.trim();
    return statusText
      ? `${error.response.status} ${statusText}`
      : String(error.response.status);
  }

  return 'CORS/Network';
}

function getFullUrl(error: AxiosErrorLike) {
  const baseURL = error.config?.baseURL?.replace(/\/$/, '') ?? '';
  const url = error.config?.url ?? '';

  if (!baseURL || /^https?:\/\//i.test(url)) {
    return url;
  }

  return `${baseURL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getDisplayPath(error: AxiosErrorLike) {
  const fullUrl = getFullUrl(error) || error.config?.url || '/';

  try {
    const parsed = new URL(fullUrl);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return fullUrl;
  }
}

function shouldIgnoreUrl(url: string, matchers: Array<string | RegExp>) {
  return matchers.some((matcher) => {
    if (typeof matcher === 'string') {
      return matcher.length > 0 && url.startsWith(matcher);
    }

    return matcher.test(url);
  });
}
