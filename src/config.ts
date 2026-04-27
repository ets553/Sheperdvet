export interface ShepherdConfig {
  baseUrl: string;
  apiKey: string;
  authScheme: string;
  authHeader: string;
  timeoutMs: number;
}

export function loadConfig(): ShepherdConfig {
  const baseUrl = (process.env.SHEPHERD_BASE_URL ?? "https://api.shepherd.vet").replace(/\/+$/, "");
  const apiKey = process.env.SHEPHERD_API_KEY ?? "";
  const authScheme = process.env.SHEPHERD_AUTH_SCHEME ?? "Bearer";
  const authHeader = process.env.SHEPHERD_AUTH_HEADER ?? "Authorization";
  const timeoutMs = Number(process.env.SHEPHERD_TIMEOUT_MS ?? 30000);

  if (!apiKey) {
    process.stderr.write(
      "[shepherd-vet-mcp] Warning: SHEPHERD_API_KEY is not set. API calls will fail.\n",
    );
  }

  return { baseUrl, apiKey, authScheme, authHeader, timeoutMs };
}
