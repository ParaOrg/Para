import { contributeConfig } from './env';

let isConnected = false;

/**
 * Called by the page's entry point: this page may sign in and upload. The client itself is
 * made when the page first asks who is signed in, and its code is precached, so a signed-in
 * phone opens and records with no signal; only signing in and uploading need it.
 */
export function connectContributions(): void {
  isConnected = contributeConfig !== null;
}

/**
 * Whether this build can upload at all; without config, recordings stay on the phone. Kept apart
 * from the client so code that only asks this (consent's question) does not import the client.
 */
export function canUpload(): boolean {
  return isConnected;
}
