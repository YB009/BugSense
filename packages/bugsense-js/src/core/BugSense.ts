import { ErrorCollector } from '../collectors/ErrorCollector';
import { FlushResult, HttpTransport } from '../transport/HttpTransport';

export interface BugSenseClientOptions {
  apiKey: string;
  endpoint: string;
  projectId: string;
  environment?: string;
  release?: string;
  autoCapture?: boolean;
  flushIntervalMs?: number;
  maxBatchSize?: number;
}

export interface CaptureExceptionContext {
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface BrowserCollectorCleanup {
  stop(): void;
}

export class BugSense {
  private readonly collector = new ErrorCollector();
  private readonly transport: HttpTransport;
  private cleanup?: BrowserCollectorCleanup;

  constructor(private readonly options: BugSenseClientOptions) {
    this.transport = new HttpTransport({
      endpoint: options.endpoint,
      apiKey: options.apiKey,
      flushIntervalMs: options.flushIntervalMs,
      maxBatchSize: options.maxBatchSize,
    });

    if (options.autoCapture !== false) {
      this.start();
    }
  }

  start() {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.cleanup) {
      return;
    }

    const previousOnError = window.onerror;
    const previousOnUnhandledRejection = window.onunhandledrejection;

    window.onerror = (
      message: string | Event,
      source?: string,
      lineno?: number,
      colno?: number,
      error?: Error,
    ) => {
      void this.captureWindowError(message, source, lineno, colno, error);

      if (typeof previousOnError === 'function') {
        return previousOnError(message, source, lineno, colno, error);
      }

      return false;
    };

    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      void this.captureUnhandledRejection(event.reason);

      if (typeof previousOnUnhandledRejection === 'function') {
        return previousOnUnhandledRejection.call(window, event);
      }
    };

    this.cleanup = {
      stop: () => {
        window.onerror = previousOnError;
        window.onunhandledrejection = previousOnUnhandledRejection;
        this.cleanup = undefined;
      },
    };
  }

  stop() {
    this.cleanup?.stop();
  }

  flush(): Promise<FlushResult> {
    return this.transport.flush();
  }

  captureException(error: unknown, context?: CaptureExceptionContext) {
    const collected = this.collector.collect(error);
    const payload = this.buildPayload(collected, context);
    return this.transport.send(payload);
  }

  captureMessage(message: string, context?: CaptureExceptionContext) {
    return this.transport.send(
      this.buildPayload(
        {
          message,
          exceptionType: 'Message',
          stackTrace: '',
        },
        context,
      ),
    );
  }

  private captureWindowError(
    message: string | Event,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error | null,
  ) {
    const collected = this.collector.collectWindowError(
      message,
      source,
      lineno,
      colno,
      error,
    );

    return this.transport.send(this.buildPayload(collected));
  }

  private captureUnhandledRejection(reason: unknown) {
    const collected = this.collector.collectUnhandledRejection(reason);
    return this.transport.send(this.buildPayload(collected));
  }

  private buildPayload(
    collected: ReturnType<ErrorCollector['collect']>,
    context?: CaptureExceptionContext,
  ) {
    return {
      projectId: this.options.projectId,
      message: collected.message,
      platform: 'browser',
      level: 'error',
      environment: this.options.environment ?? 'production',
      releaseVersion: this.options.release ?? null,
      exceptionType: collected.exceptionType,
      stackTrace: collected.stackTrace,
      metadata: {
        ...collected.metadata,
        ...context?.metadata,
      },
      tags: context?.tags ?? {},
    };
  }
}
