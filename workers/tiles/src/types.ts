// The slice of Cloudflare's runtime types this Worker uses, so it bundles with no install step.

export interface R2ObjectBody {
  arrayBuffer(): Promise<ArrayBuffer>;
  readonly body: ReadableStream<Uint8Array>;
  readonly httpEtag: string;
  readonly size: number;
}

export interface R2Bucket {
  get(
    key: string,
    options?: { range?: { offset: number; length: number } },
  ): Promise<R2ObjectBody | null>;
}

export interface Env {
  TILES: R2Bucket;
  EXTRA_ORIGINS?: string;
}

export interface EdgeCache {
  match(request: Request | string): Promise<Response | undefined>;
  put(request: Request | string, response: Response): Promise<void>;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

declare global {
  interface CacheStorage {
    default: EdgeCache;
  }
}
