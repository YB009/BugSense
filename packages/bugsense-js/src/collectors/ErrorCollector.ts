export interface CollectedError {
  message: string;
  exceptionType: string;
  stackTrace: string;
  metadata?: Record<string, unknown>;
}

export class ErrorCollector {
  collect(error: unknown): CollectedError {
    if (error instanceof Error) {
      return {
        message: error.message,
        exceptionType: error.name,
        stackTrace: error.stack ?? '',
      };
    }

    return {
      message: String(error),
      exceptionType: 'UnknownError',
      stackTrace: '',
    };
  }

  collectWindowError(
    message: string | Event,
    source?: string,
    lineno?: number,
    colno?: number,
    error?: Error | null,
  ): CollectedError {
    const normalized = this.collect(error ?? message);
    return {
      ...normalized,
      message:
        typeof message === 'string' && message.trim().length > 0
          ? message
          : normalized.message,
      metadata: {
        source: source ?? null,
        lineno: lineno ?? null,
        colno: colno ?? null,
      },
    };
  }

  collectUnhandledRejection(reason: unknown): CollectedError {
    return this.collect(reason);
  }
}
