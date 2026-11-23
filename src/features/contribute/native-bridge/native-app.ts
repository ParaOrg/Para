// The web side of the Android app, kept apart from ../native/: every page loads this folder, while
// the build check holds native/ to the app's own build.
import type { CapacitorGlobal, HttpResponse } from '@capacitor/core';

import { textOfResponse } from './response-text';

type NativeHttp = (options: { url: string; responseType: 'text' }) => Promise<HttpResponse>;

let capacitor: CapacitorGlobal | null = null;
let nativeGet: NativeHttp | null = null;

/**
 * Loads Capacitor's JavaScript in the Android app's build (`--mode apk`) and does nothing on
 * the web, whose bundle then carries none of it (check-build.mjs proves it). Android injects only
 * the low-level bridge (`window.androidBridge`); `window.Capacitor` and `registerPlugin` come
 * from this import, so the entry point waits for it before the page renders.
 */
export async function prepareNativeApp(): Promise<void> {
  if (import.meta.env.MODE !== 'apk') return;
  const core = await import('@capacitor/core');
  capacitor = core.Capacitor;
  nativeGet = (options) => core.CapacitorHttp.get(options);
}

/** Whether the page runs inside the Android app. */
export function isNativeApp(): boolean {
  return capacitor?.isNativePlatform() === true;
}

/**
 * A getter for a native plugin's bridge, by the name it registers under, made on the first call
 * and kept: Capacitor warns each time a name is registered again. The getter works only inside
 * the app; making it does not need the app, so a module may make it as it loads.
 */
export function lazyPlugin<T>(name: string): () => T {
  let plugin: T | null = null;
  return () => {
    if (plugin !== null) return plugin;
    if (!capacitor) throw new Error('This page is not running inside the Android app.');
    plugin = capacitor.registerPlugin<T>(name);
    return plugin;
  };
}

/**
 * Reads a text file through the phone's own HTTP client, which follows redirects and is not held
 * to CORS: a WebView `fetch` from https://localhost cannot read GitHub's release assets. Only for
 * single requests; Capacitor's global fetch patch stays off, so Supabase's calls are untouched.
 * Throws when not in the app or on a non-2xx answer.
 */
export async function nativeGetText(url: string): Promise<string> {
  if (!nativeGet) throw new Error('native HTTP is only available inside the Android app');
  return textOfResponse(await nativeGet({ url, responseType: 'text' }));
}
