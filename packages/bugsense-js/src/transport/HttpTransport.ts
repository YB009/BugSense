export interface HttpTransportOptions {
  endpoint: string;
  apiKey: string;
  flushIntervalMs?: number;
  maxBatchSize?: number;
}

export interface EnqueueResult {
  enqueued: true;
  queueSize: number;
}

export interface FlushResult {
  delivered: boolean;
  sent: number;
  failed: number;
}

export class HttpTransport {
  private readonly flushIntervalMs: number;
  private readonly maxBatchSize: number;
  private readonly queue: unknown[] = [];
  private flushTimer?: ReturnType<typeof setTimeout>;
  private activeFlush?: Promise<FlushResult>;

  constructor(private readonly options: HttpTransportOptions) {
    this.flushIntervalMs = options.flushIntervalMs ?? 5000;
    this.maxBatchSize = options.maxBatchSize ?? 10;
  }

  async send(payload: unknown): Promise<EnqueueResult | FlushResult> {
    this.queue.push(payload);

    if (this.queue.length >= this.maxBatchSize) {
      return this.flush();
    }

    this.scheduleFlush();
    return {
      enqueued: true,
      queueSize: this.queue.length,
    };
  }

  async flush(): Promise<FlushResult> {
    if (this.activeFlush) {
      return this.activeFlush;
    }

    this.clearFlushTimer();
    this.activeFlush = this.flushQueue();

    try {
      return await this.activeFlush;
    } finally {
      this.activeFlush = undefined;
      if (this.queue.length > 0) {
        this.scheduleFlush();
      }
    }
  }

  private async flushQueue(): Promise<FlushResult> {
    if (this.queue.length === 0) {
      return {
        delivered: true,
        sent: 0,
        failed: 0,
      };
    }

    const batch = this.queue.splice(0, this.maxBatchSize);
    if (typeof fetch !== 'function') {
      return {
        delivered: false,
        sent: 0,
        failed: batch.length,
      };
    }

    const results = await Promise.allSettled(
      batch.map((payload) => this.deliver(payload)),
    );

    const failedPayloads: unknown[] = [];
    let sent = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        sent += 1;
        return;
      }

      failedPayloads.push(batch[index]);
    });

    if (failedPayloads.length > 0) {
      this.queue.unshift(...failedPayloads);
    }

    return {
      delivered: failedPayloads.length === 0,
      sent,
      failed: failedPayloads.length,
    };
  }

  private async deliver(payload: unknown) {
    const response = await fetch(this.options.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bugsense-api-key': this.options.apiKey,
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  }

  private scheduleFlush() {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      void this.flush();
    }, this.flushIntervalMs);
  }

  private clearFlushTimer() {
    if (!this.flushTimer) {
      return;
    }

    clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
  }
}
