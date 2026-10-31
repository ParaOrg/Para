/** The chunk's address, as Chromium and Firefox name it in a failed dynamic import's message. */
const FAILED_CHUNK_URL = /https?:\/\/\S+/;

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
      fresh.searchParams.set('retry', String(Date.now()));
      return import(/* @vite-ignore */ fresh.href);
    });
}
