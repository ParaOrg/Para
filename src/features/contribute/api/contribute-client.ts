import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/shared/types/database.types';

import { contributeConfig } from './env';

/** The contributor page's client, typed by the generated schema. */
export type ContributeClient = SupabaseClient<Database>;

/**
 * The phone's session lives under its own key. The studio shares this origin,
 * and with the default key an anonymous sign-in here would replace an editor's
 * studio session in the same browser.
 */
export const CONTRIBUTOR_AUTH_KEY = 'para.contributor-auth';

let isConnected = false;
let client: Promise<ContributeClient> | null = null;

/**
 * Called by the page's entry point: this page may sign in and upload. The client itself is
 * made when the page first asks who is signed in, and its code is precached, so a signed-in
 * phone opens and records with no signal; only signing in and uploading need it.
 */
export function connectContributions(): void {
  isConnected = contributeConfig !== null;
}

/** Whether this build can upload at all; without config, recordings stay on the phone. */
export function canUpload(): boolean {
  return isConnected;
}

/** This page's client, loaded on first use, or null when it cannot upload. */
export function contributeClient(): Promise<ContributeClient> | null {
  const config = contributeConfig;
  if (!isConnected || !config) return null;
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient<Database>(config.url, config.key, {
      auth: { storageKey: CONTRIBUTOR_AUTH_KEY, persistSession: true, detectSessionInUrl: false },
    }),
  );
  return client;
}
