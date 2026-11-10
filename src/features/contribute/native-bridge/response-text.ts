interface NativeResponse {
  status: number;
  data: unknown;
}

/**
 * The body of a 2xx answer as text; throws on any other status. A JSON answer the phone's HTTP
 * client has already read (it does for application/json, text asked for or not) comes back as
 * its JSON text.
 */
export function textOfResponse(response: NativeResponse): string {
  if (response.status < 200 || response.status > 299) {
    throw new Error(`HTTP ${response.status}`);
  }
  return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
}
