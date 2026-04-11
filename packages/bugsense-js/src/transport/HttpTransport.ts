export interface HttpTransportOptions {
  endpoint: string;
  apiKey: string;
}

export class HttpTransport {
  constructor(private readonly options: HttpTransportOptions) {}

  async send(payload: unknown) {
    if (typeof fetch !== 'function') {
      return {
        delivered: false,
        reason: 'fetch-unavailable',
        payload,
      };
    }

    const response = await fetch(this.options.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bugsense-api-key': this.options.apiKey,
      },
      body: JSON.stringify(payload),
    });

    return {
      delivered: response.ok,
      status: response.status,
    };
  }
}
