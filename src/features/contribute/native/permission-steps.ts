import type { NativePermission, NativePermissionStates } from './native-permissions';

/** Android 13 added the notification permission and Android 10 "all the time" location. */
const NOTIFICATIONS_SDK = 33;
const BACKGROUND_LOCATION_SDK = 29;

/** What each permission is for, in the words shown before Android's own question. */
export const PERMISSION_REASONS = {
  notifications: {
    title: 'Show the recording notice',
    reason:
      'While you record, Android shows a notice that says Para is recording. It is how you know the recording is on.',
    refusedTitle: 'The recording notice is off',
    refused:
      'Without it, Para cannot show its recording notice. You can still record, but the notice that tells you it is on will not show.',
  },
  location: {
    title: 'Use your location',
    reason:
      'Para draws the route you ride from your phone’s location, so it needs to know where you are while you record.',
    refusedTitle: 'Location is off',
    refused: 'Para cannot record a route without your location.',
  },
  backgroundLocation: {
    title: 'Use it all the time',
    reason:
      'So the recording goes on when the screen is off or another app is open. Choose “Allow all the time”. Para only uses your location between Start and Stop.',
    refusedTitle: '“All the time” is off',
    refused:
      'Without it, recording may stop when the screen turns off or you open another app. It works with the screen on.',
  },
} satisfies Record<
  NativePermission,
  { title: string; reason: string; refusedTitle: string; refused: string }
>;

/** The permissions this Android version has, in the order they are asked for. */
export function neededPermissions(sdk: number): NativePermission[] {
  const needed: NativePermission[] = [];
  if (sdk >= NOTIFICATIONS_SDK) needed.push('notifications');
  needed.push('location');
  if (sdk >= BACKGROUND_LOCATION_SDK) needed.push('backgroundLocation');
  return needed;
}

/** The first needed permission not granted yet, or null when recording may start. */
export function firstMissing(
  states: NativePermissionStates,
  needed: readonly NativePermission[],
): NativePermission | null {
  return needed.find((permission) => states[permission] !== 'granted') ?? null;
}

/** Without location nothing can be recorded; the others only change how well it goes on. */
export function canRecordWithout(permission: NativePermission): boolean {
  return permission !== 'location';
}
