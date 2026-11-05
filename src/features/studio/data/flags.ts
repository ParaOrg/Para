import * as z from 'zod/mini';

/**
 * Contributors' uploads: the Contributors map reads them. Off until the owner
 * has applied the contributions migration and turned on anonymous sign-ins;
 * with it off the Contributors map stays a placeholder and nothing asks for a
 * table the project may not have. VITE_CONTRIBUTIONS=1 turns it on, on this
 * page and the contributor page alike.
 */
export const CONTRIBUTIONS: boolean =
  z.optional(z.enum(['0', '1'])).parse(import.meta.env.VITE_CONTRIBUTIONS) === '1';
