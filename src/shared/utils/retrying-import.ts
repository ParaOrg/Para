/** The chunk's address, as Chromium and Firefox name it in a failed dynamic import's message. */
const FAILED_CHUNK_URL = /https?:\/\/\S+/;
/** Retries asked so far: with the time, each retry's address is one never asked for before. */
let retries = 0;

/**
 * A dynamic import that, once failed, is asked again at a fresh address. Chromium keeps a failed
 * dynamic import failed for the life of the page, so a chunk not fetched while offline would stay
 * unreachable after the signal returns. Asking for the same file with a query the module map has
 * not seen fetches it anew; the chunks it imports keep their addresses.
 */
export function retryingImport<T>(load: () => Promise<T>): () => Promise<T> {
  return () =>
    load().catch((error: unknown) => {
      const address = error instanceof Error ? FAILED_CHUNK_URL.exec(error.message)?.[0] : null;
      if (!address) throw error;
      const fresh = new URL(address);
      // The time alone can repeat (a clock held still, or two retries in one millisecond), and an
      // address that failed once stays failed for the page.
      retries += 1;
      fresh.searchParams.set('retry', `${Date.now()}-${retries}`);
      return import(/* @vite-ignore */ fresh.href);
    });
}
