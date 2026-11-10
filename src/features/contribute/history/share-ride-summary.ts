import { isNativeApp } from '../native-bridge/native-app';

/**
 * How handing the card on went: shared, saved as a file, the share sheet closed unused, or the
 * Android app's share sheet failed to open, so the rider takes a screenshot.
 */
export type ShareOutcome = 'shared' | 'saved' | 'cancelled' | 'screenshot';

const SHARE_TITLE = 'My ride on Para';

/**
 * The card handed to the phone's share sheet where the browser can share files (Chrome on Android,
 * Safari on iPhone), else saved as a download. The Android app's WebView has neither Web Share nor
 * a download handler, so there the picture goes to Android's share sheet through our own plugin.
 */
export async function shareOrSave(blob: Blob, fileName: string): Promise<ShareOutcome> {
  if (import.meta.env.MODE === 'apk' && isNativeApp()) {
    try {
      const { shareNativeImage } = await import('../native/native-share');
      await shareNativeImage(blob, fileName, SHARE_TITLE);
      return 'shared';
    } catch (error) {
      console.warn('The ride card could not be shared from the app.', error);
      return 'screenshot';
    }
  }
  const file = new File([blob], fileName, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: SHARE_TITLE });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      // Anything else (a permission the browser withheld): save it instead.
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // The download has its own copy once the click is handled.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}

/** The file's name, dated by the ride's day in Manila: `para-ride-2026-01-25.png`. */
export function summaryFileName(startedAt: number): string {
  const day = new Date(startedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  return `para-ride-${day}.png`;
}
