import type { PluginListenerHandle } from '@capacitor/core';

import { isNativeApp, lazyPlugin } from './native-app';

/*
 * Android's Back, from the app's own plugin (android/…/BackPlugin.java), reached by name so the web
 * bundle carries none of Capacitor. The plugin takes Back from the WebView: the page decides what
 * it closes, and asks the plugin to leave when nothing is left to close.
 */

interface BackPlugin {
  addListener(eventName: 'back', listener: () => void): Promise<PluginListenerHandle>;
  /** Leaves the app as Home does: the task to the back, a ride still recording. */
  leave(): Promise<void>;
}

const nativeBack = lazyPlugin<BackPlugin>('Back');

/** On the web there is no Back of the app's to stop listening to. */
function noListener(): void {
  return;
}

/** Calls `onBack` on each Back press in the Android app; nothing on the web. Returns the stop. */
export function listenForBack(onBack: () => void): () => void {
  if (!isNativeApp()) return noListener;
  const handle = nativeBack().addListener('back', onBack);
  return () => {
    handle
      .then((h) => h.remove())
      .catch((error: unknown) => {
        console.warn("Back's listener could not be removed.", error);
      });
  };
}

/** Leaves the app as Home does; nothing on the web, where Back is the browser's. */
export function leaveApp(): void {
  if (!isNativeApp()) return;
  nativeBack()
    .leave()
    .catch((error: unknown) => {
      console.warn('The app could not be left by Back.', error);
    });
}
