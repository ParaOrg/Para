import { nativePlugin } from './native-app';

export type NativePermission = 'notifications' | 'location' | 'backgroundLocation';
export type NativePermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';
export type NativePermissionStates = Record<NativePermission, NativePermissionState>;

interface NativePermissionsPlugin {
  checkPermissions: () => Promise<NativePermissionStates>;
  requestPermissions: (options: {
    permissions: NativePermission[];
  }) => Promise<NativePermissionStates>;
}

const getPlugin = () => nativePlugin<NativePermissionsPlugin>('NativePermissions');

/** Why each permission is asked for, shown before Android's own prompt. */
export const PERMISSION_REASONS: Record<NativePermission, { title: string; reason: string }> = {
  notifications: {
    title: 'Show the recording notice',
    reason:
      'While you record, Android shows a notice that says ParaPo is recording. It is how you know the recording is on, and how Android lets it go on with the screen off.',
  },
  location: {
    title: 'Use your location',
    reason:
      'ParaPo draws the route you ride from your phone’s location, so it needs to know where you are while you record.',
  },
  backgroundLocation: {
    title: 'Use it all the time',
    reason:
      'So the recording goes on when the screen is off or another app is open. Choose “Allow all the time”. ParaPo only uses your location between Start and Stop.',
  },
};

export function checkNativePermissions(): Promise<NativePermissionStates> {
  return getPlugin().checkPermissions();
}

/** Asks for one permission. Android wants location first, then "all the time" by itself. */
export function requestNativePermission(
  permission: NativePermission,
): Promise<NativePermissionStates> {
  return getPlugin().requestPermissions({ permissions: [permission] });
}
