import { useSyncExternalStore } from 'react';

/**
 * The browser's offer to install Para Po, kept for the install prompt
 * (InstallPrompt). Chromium fires `beforeinstallprompt` when the page is
 * installable and not installed yet; nothing else says so. Kept only on
 * Android (the owner's pick, 2026-10-13: "Android only for now"): an iPhone
 * has no install a page can start — its Share → Add to Home Screen is a
 * design of its own, not drawn yet — and a computer's Chrome offers it from
 * the address bar already.
 */

/** Chromium's install offer. TypeScript's DOM types do not have it. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isInstallOffer = (event: Event): event is BeforeInstallPromptEvent => 'prompt' in event;

let offer: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const changed = () => {
  for (const listener of listeners) listener();
};

/** Listens for the offer from the page's start: it can come before React has drawn anything. */
export function listenForInstallOffer(): void {
  if (!/Android/i.test(navigator.userAgent)) return;
  window.addEventListener('beforeinstallprompt', (event) => {
    if (!isInstallOffer(event)) return;
    // Chrome's own mini-infobar stays away: the prompt asks instead.
    event.preventDefault();
    offer = event;
    changed();
  });
  window.addEventListener('appinstalled', () => {
    offer = null;
    changed();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** True while the browser would install Para Po on a tap. */
export function useInstallOffer(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => offer !== null,
    () => false,
  );
}

/**
 * Shows the browser's own install dialog. An offer is good for one ask: let
 * go there, it is gone until the browser offers again, on a later visit.
 */
export async function installApp(): Promise<void> {
  const asked = offer;
  if (!asked) return;
  offer = null;
  changed();
  await asked.prompt();
  await asked.userChoice;
}
