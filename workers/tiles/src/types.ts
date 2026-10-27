// The slice of Cloudflare's runtime types this Worker uses, so it bundles with no install step.

export interface R2Object {
  readonly etag: string;
  readonly httpEtag: string;
  readonly size: number;
}

export interface R2ObjectBody extends R2Object {
  arrayBuffer(): Promise<ArrayBuffer>;
  readonly body: ReadableStream<Uint8Array>;
}

export interface R2GetOptions {
  range?: { offset: number; length: number };
  /** When the condition fails R2 answers with the object's metadata and no body. */
  onlyIf?: { etagMatches?: string };
}

export interface R2Bucket {
  get(key: string, options?: R2GetOptions): Promise<R2Object | R2ObjectBody | null>;
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

/** `encodeBody: 'manual'` tells the runtime a body is already encoded as its Content-Encoding says. */
export interface WorkerResponseInit extends ResponseInit {
  encodeBody?: 'automatic' | 'manual';
}

export function isBody(object: R2Object | R2ObjectBody): object is R2ObjectBody {
  return 'arrayBuffer' in object;
}
