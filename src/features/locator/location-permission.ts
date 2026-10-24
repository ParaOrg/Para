/**
 * Whether the browser already lets this site read the location, so the locator
 * can start without a tap. False when it is asked, refused, or cannot say: the
 * Permissions API is missing in some browsers and throws for `geolocation` in others.
 */
export async function isLocationGranted(): Promise<boolean> {
  try {
    if (!navigator.permissions) return false;
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state === 'granted';
  } catch {
    // A browser that cannot say is a browser the button asks in.
    return false;
  }
}
