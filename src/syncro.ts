/**
 * Thin wrapper around the SyncroMSP REST API v1.
 * Docs: https://api-docs.syncromsp.com/
 */

export interface SyncroConfig {
  baseUrl: string;
  apiKey: string;
}

export class SyncroError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "SyncroError";
    this.status = status;
    this.body = body;
  }
}

export class SyncroClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: SyncroConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
  }

  static fromEnv(): SyncroClient {
    const apiKey = process.env.SYNCRO_API_KEY;
    if (!apiKey) {
      throw new Error("SYNCRO_API_KEY is required");
    }
    let baseUrl = process.env.SYNCRO_BASE_URL;
    if (!baseUrl) {
      const sub = process.env.SYNCRO_SUBDOMAIN;
      if (!sub) {
        throw new Error(
          "Set SYNCRO_SUBDOMAIN (e.g. 'acme') or SYNCRO_BASE_URL"
        );
      }
      baseUrl = `https://${sub}.syncromsp.com/api/v1`;
    }
    return new SyncroClient({ baseUrl, apiKey });
  }

  async request<T = unknown>(
    method: string,
    path: string,
    opts: { query?: Record<string, unknown>; body?: unknown } = {}
  ): Promise<T> {
    const url = new URL(this.baseUrl + path);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) {
          for (const item of v) url.searchParams.append(k, String(item));
        } else {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
      "User-Agent": "syncromsp-mcp-server/0.1",
    };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }

    const res = await fetch(url, { method, headers, body });
    const text = await res.text();
    let parsed: unknown = text;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        // leave as text
      }
    }
    if (!res.ok) {
      throw new SyncroError(
        `Syncro ${method} ${path} failed: ${res.status} ${res.statusText}`,
        res.status,
        parsed
      );
    }
    return parsed as T;
  }

  get<T = unknown>(path: string, query?: Record<string, unknown>) {
    return this.request<T>("GET", path, { query });
  }

  post<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("POST", path, { body });
  }

  put<T = unknown>(path: string, body?: unknown) {
    return this.request<T>("PUT", path, { body });
  }

  delete<T = unknown>(path: string) {
    return this.request<T>("DELETE", path);
  }
}
