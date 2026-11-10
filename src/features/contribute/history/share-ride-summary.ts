/** How handing the card on went: shared, saved as a file, or the share sheet closed unused. */
export type ShareOutcome = 'shared' | 'saved' | 'cancelled';

/**
 * The card handed to the phone's share sheet where the browser can share files (Chrome on Android,
 * Safari on iPhone), else saved as a download. The APK's WebView has no Web Share, so it saves.
 * ponytail: no @capacitor/share yet; add it when the APK should open the share sheet too.
 */
export async function shareOrSave(blob: Blob, fileName: string): Promise<ShareOutcome> {
  const file = new File([blob], fileName, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'My ride on Para' });
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
