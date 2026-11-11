/**
 * What the sidebar's footer asked for: Save as draft keeps the change to editors; Publish makes
 * it what commuters get at the next publish. A route's and a hotspot's saves take it alike.
 */
export type SaveIntent = 'draft' | 'publish';

/**
 * A publish that stopped after the draft save. The approval submits first, so a refusal after
 * it leaves the draft stored, and the sidebar's Approve finishes the publish.
 */
export const NOT_PUBLISHED =
  'Saved as a draft, not published. To publish it, tap it on the map and press Approve.';
