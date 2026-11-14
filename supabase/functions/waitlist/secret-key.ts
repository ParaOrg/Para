// The project's secret key, read from SUPABASE_SECRET_KEYS: a JSON object Supabase sets, of keys
// by name. The waitlist writes with the one named "default". Without it the function must stop,
// not send the database an apikey of "undefined" and answer every visitor "try later".
//
// No imports, so tests/unit/waitlist-secret-key-test.mjs runs it under Node.

/** The "default" key from SUPABASE_SECRET_KEYS; throws, naming what is wrong, when there is none. */
export function defaultSecretKey(secretKeys: string): string {
  let keys: unknown;
  try {
    keys = JSON.parse(secretKeys);
  } catch {
    throw new Error('waitlist: SUPABASE_SECRET_KEYS is not JSON');
  }
  if (typeof keys !== 'object' || keys === null || !('default' in keys)) {
    throw new Error('waitlist: SUPABASE_SECRET_KEYS has no "default" key');
  }
  const key = keys.default;
  if (typeof key !== 'string' || key === '') {
    throw new Error('waitlist: the "default" key in SUPABASE_SECRET_KEYS is empty or not text');
  }
  return key;
}
