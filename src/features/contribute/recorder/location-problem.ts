import type { WatchError } from './use-geolocation-watch';
import { isNativeApp } from '../native-bridge/native-app';

const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;

/** What a failed location request means for the contributor, in words and what to do. */
export function locationProblem(error: WatchError): string {
  if (error.code === PERMISSION_DENIED) {
    return isNativeApp()
      ? 'Location is off for Para. Turn it on in the phone’s Settings, under Apps, Para, Permissions, then start again.'
      : 'Location is blocked for this page. Allow it in the browser settings, then start again.';
  }
  if (error.code === POSITION_UNAVAILABLE) {
    return 'The phone could not work out where it is. Check that location is on.';
  }
  return 'The phone took too long to find its position.';
}
