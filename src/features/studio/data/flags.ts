/**
 * Saves as drafts (0022), reviewed before they reach the approved rows. Off
 * until the studio has the controls to submit, approve, send back and settle
 * a conflict: with it off every save writes the approved rows as before, so
 * no editor is left unable to publish. Set VITE_STUDIO_DRAFTS=1 to try it.
 */
export const STUDIO_DRAFTS: boolean = import.meta.env.VITE_STUDIO_DRAFTS === '1';
