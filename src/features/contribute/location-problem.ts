import { isNativeApp } from './native-app';
import type { WatchError } from './use-geolocation-watch';

const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;

/** What a failed location request means for the contributor, in words and what to do. */
export function locationProblem(error: WatchError): string {
  if (error.code === PERMISSION_DENIED) {
    return isNativeApp()
      ? 'Location is off for ParaPo. Turn it on in the phone’s Settings, under Apps, ParaPo, Permissions, then start again.'
      : 'Location is blocked for this page. Allow it in the browser settings, then start again.';
  }
  if (error.code === POSITION_UNAVAILABLE) {
    return 'The phone could not work out where it is. Check that location is on.';
  }
  return 'The phone took too long to find its position.';
}
