import { isEmulatorRide } from '@/shared/config/env';

import { isNativeApp } from './native-app';

/*
 * The phone's location setting, for the locate button in the app. As in native-fixes.ts, the
 * check sits here, in the page's own code, so the web build drops the native module behind it.
 */

/**
 * Whether the phone's location is on, asked as the locate button is tapped. In the app, with it
 * off, Google's "Turn on location?" dialog shows and its answer is the answer: "off" once the
 * contributor said no, or when the dialog could not show. "unknown" on the web, in the emulator
 * ride's build, or when the app could not tell: the button goes on as the browser's would.
 */
export async function checkLocationOn(): Promise<'on' | 'off' | 'unknown'> {
  if (import.meta.env.MODE !== 'apk' || !isNativeApp() || isEmulatorRide) return 'unknown';
  try {
    const { checkLocationOn: askTheApp } = await import('../native/native-permissions');
    return await askTheApp();
  } catch (error) {
    console.warn('The phone could not say whether location is on.', error);
    return 'unknown';
  }
}
