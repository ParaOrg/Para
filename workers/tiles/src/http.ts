import { corsHeaders } from './cors';
import type { WorkerResponseInit } from './types';

export function text(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

/** Copies a response and adds the CORS headers. The copy must not be re-encoded. */
export function withCors(response: Response, origin: string | null): Response {
  const init: WorkerResponseInit = {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    encodeBody: response.headers.has('Content-Encoding') ? 'manual' : 'automatic',
  };
  const out = new Response(response.body, init);
  for (const [name, value] of Object.entries(corsHeaders(origin))) out.headers.set(name, value);
  return out;
}

/** Whether an If-None-Match header names `etag` (weak tags, lists and `*` included). */
export function etagMatches(header: string | null, etag: string): boolean {
  if (!header) return false;
  const strong = (tag: string) => tag.trim().replace(/^W\//, '');
  return header.split(',').some((tag) => strong(tag) === '*' || strong(tag) === strong(etag));
}

export function notModified(etag: string, cacheControl: string | null): Response {
  const headers = new Headers({ ETag: etag });
  if (cacheControl) headers.set('Cache-Control', cacheControl);
  return new Response(null, { status: 304, headers });
}

/** A 304 in place of a 200 whose ETag the request already holds. */
export function answerConditional(request: Request, response: Response): Response {
  const etag = response.headers.get('ETag');
  if (response.status !== 200 || !etag) return response;
  return etagMatches(request.headers.get('If-None-Match'), etag)
    ? notModified(etag, response.headers.get('Cache-Control'))
    : response;
}
