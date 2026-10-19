import * as z from 'zod/mini';

/**
 * Saves as drafts (0022), reviewed before they reach the approved rows. Off
 * until the studio has the controls to submit, approve, send back and settle
 * a conflict: with it off every save writes the approved rows as before, so
 * no editor is left unable to publish. Set VITE_STUDIO_DRAFTS=1 to try it;
 * any value but unset, 0 or 1 is refused when the studio loads.
 */
export const STUDIO_DRAFTS: boolean =
  z.optional(z.enum(['0', '1'])).parse(import.meta.env.VITE_STUDIO_DRAFTS) === '1';

/**
 * Contributors' uploads: the Contributors map reads them. Off until the owner
 * has applied the contributions migration and turned on anonymous sign-ins;
 * with it off the Contributors map stays a placeholder and nothing asks for a
 * table the project may not have. VITE_CONTRIBUTIONS=1 turns it on, on this
 * page and the contributor page alike.
 */
export const CONTRIBUTIONS: boolean =
  z.optional(z.enum(['0', '1'])).parse(import.meta.env.VITE_CONTRIBUTIONS) === '1';
