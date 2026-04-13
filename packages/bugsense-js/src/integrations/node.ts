import type { BugSense } from '../core/BugSense';

export interface NodeHandlerOptions {
  captureUncaughtException?: boolean;
  captureUnhandledRejection?: boolean;
}

export interface NodeHandlerCleanup {
  stop(): void;
}

export function registerNodeHandlers(
  bugsense: BugSense,
  options: NodeHandlerOptions = {},
): NodeHandlerCleanup {
  const captureUncaughtException = options.captureUncaughtException ?? true;
  const captureUnhandledRejection = options.captureUnhandledRejection ?? true;

  const uncaughtExceptionHandler = (error: Error) => {
    void bugsense.captureException(error, {
      tags: {
        source: 'node-uncaught-exception',
      },
    });
  };

  const unhandledRejectionHandler = (reason: unknown) => {
    void bugsense.captureException(reason, {
      tags: {
        source: 'node-unhandled-rejection',
      },
    });
  };

  if (captureUncaughtException) {
    process.on('uncaughtException', uncaughtExceptionHandler);
  }

  if (captureUnhandledRejection) {
    process.on('unhandledRejection', unhandledRejectionHandler);
  }

  return {
    stop() {
      if (captureUncaughtException) {
        process.off('uncaughtException', uncaughtExceptionHandler);
      }

      if (captureUnhandledRejection) {
        process.off('unhandledRejection', unhandledRejectionHandler);
      }
    },
  };
}
