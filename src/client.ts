import type { ShepherdConfig } from "./config.js";

export class ShepherdApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ShepherdApiError";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

export class ShepherdClient {
  constructor(private readonly config: ShepherdConfig) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", query, body } = options;
    const url = this.buildUrl(path, query);

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "shepherd-vet-mcp/0.1",
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (this.config.apiKey) {
      const headerName = this.config.authHeader;
      const value =
        headerName.toLowerCase() === "authorization"
          ? `${this.config.authScheme} ${this.config.apiKey}`.trim()
          : this.config.apiKey;
      headers[headerName] = value;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await response.text();
      const parsed = parseMaybeJson(text);

      if (!response.ok) {
        throw new ShepherdApiError(
          `Shepherd API ${method} ${path} failed with ${response.status} ${response.statusText}`,
          response.status,
          parsed,
        );
      }
      return parsed as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(path: string, query?: RequestOptions["query"]): string {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(this.config.baseUrl + normalized);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }
}

function parseMaybeJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
