/** The channel that tells every tab of this phone, this one too, its saved recordings changed. */
export const SAVED_CHANNEL = 'para-saved-recordings';

/**
 * Tells every open list of saved recordings to read them again: the other tabs', and this tab's
 * own, since a BroadcastChannel hears every other channel of its name, in its own tab too.
 */
export function tellSavedRecordingsChanged(): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(SAVED_CHANNEL);
  channel.postMessage('changed');
  channel.close();
}
