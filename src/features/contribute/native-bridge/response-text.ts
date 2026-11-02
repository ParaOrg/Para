interface NativeResponse {
  status: number;
  data: unknown;
}

/** The body of a 2xx answer as text; throws on any other status or a body that is not text. */
export function textOfResponse(response: NativeResponse): string {
  if (response.status < 200 || response.status > 299) {
    throw new Error(`HTTP ${response.status}`);
  }
  if (typeof response.data !== 'string') throw new Error('the answer was not text');
  return response.data;
}
