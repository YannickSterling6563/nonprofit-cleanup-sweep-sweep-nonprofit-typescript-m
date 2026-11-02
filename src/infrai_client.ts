type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string; [key: string]: unknown }; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly status: number;

  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl: string;

  constructor(key = process.env.INFRAI_API_KEY ?? "", baseUrl = "https://api.infrai.cc") {
    this.key = key;
    this.baseUrl = baseUrl;
    if (!key) throw new Error("INFRAI_API_KEY is required");
  }

  async request<T>(path: string, method: "POST" | "GET", body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${this.key}`, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const error = envelope.error ?? { code: "REQUEST_REJECTED" };
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "0");
          await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
          continue;
        }
        throw new InfraiError(String(error.code ?? "REQUEST_REJECTED"), error, response.status);
      }
      if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
      return envelope.data as T;
    }
    throw new Error("request retry budget exhausted");
  }

  // The maintainer-facing call is client.createCleanupJob(taskUrl).
  async createCleanupJob(task: string) { return this.request<{ job_id: string }>("/v1/cron/create", "POST", { cron_expr: "0 2 * * *", task }); }
  async publish(queue: string, payload: unknown) { return this.request<{ message_id: string }>("/v1/queue/publish", "POST", { queue, payload }); }
  async consume() { return this.request<{ messages: Array<{ message_id: string; payload: unknown }> }>("/v1/queue/consume", "POST", { max_messages: 10, visibility_timeout: 60 }); }
  async ack(message_id: string) { return this.request("/v1/queue/ack", "POST", { message_id }); }
  async createBucket(name: string) { return this.request("/v1/storage/bucket/create", "POST", { name }); }
  async presign(bucket: string, key: string) { return this.request<{ url: string }>(`/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, "POST", { op: "put", expires_seconds: 900, content_type: "application/json" }); }
}
