import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/shared/types/database.types';

import { canUpload } from './contribute-config';
import { contributeConfig } from './env';

/** The contributor page's client, typed by the generated schema. */
export type ContributeClient = SupabaseClient<Database>;

/**
 * The phone's session lives under its own key. The studio shares this origin,
 * and with the default key an anonymous sign-in here would replace an editor's
 * studio session in the same browser.
 */
export const CONTRIBUTOR_AUTH_KEY = 'para.contributor-auth';

let client: Promise<ContributeClient> | null = null;

/** A client handed in by setContributeClient: the unit checks' stand-in. */
let standIn: ContributeClient | null = null;

/**
 * Hands the page a client made elsewhere, in place of its own: the unit checks' stand-in, which
 * answers each database call as the check needs.
 */
export function setContributeClient(next: ContributeClient): void {
  standIn = next;
}

/** This page's client, loaded on first use, or null when it cannot upload. */
export function contributeClient(): Promise<ContributeClient> | null {
  if (standIn) return Promise.resolve(standIn);
  const config = contributeConfig;
  if (!canUpload() || !config) return null;
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient<Database>(config.url, config.key, {
      auth: { storageKey: CONTRIBUTOR_AUTH_KEY, persistSession: true, detectSessionInUrl: false },
    }),
  );
  return client;
}
