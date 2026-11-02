import type { WatchError } from './watched-fix';
import { isNativeApp } from '../native-bridge/native-app';
import type { PageProblem } from '../notices/page-problem';
import {
  LOCATION_BLOCKED_PROBLEM,
  LOCATION_OFF_PROBLEM,
  POSITION_TIMEOUT_PROBLEM,
  POSITION_UNAVAILABLE_PROBLEM,
} from '../notices/recorder-problems';

const PERMISSION_DENIED = 1;
const POSITION_UNAVAILABLE = 2;

/** What a failed location request means for the contributor: what happened, and what to do. */
export function locationProblem(error: WatchError): PageProblem {
  if (error.code === PERMISSION_DENIED) {
    return isNativeApp() ? LOCATION_OFF_PROBLEM : LOCATION_BLOCKED_PROBLEM;
  }
  if (error.code === POSITION_UNAVAILABLE) return POSITION_UNAVAILABLE_PROBLEM;
  return POSITION_TIMEOUT_PROBLEM;
}
