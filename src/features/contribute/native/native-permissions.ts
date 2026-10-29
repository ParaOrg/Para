import * as z from 'zod/mini';

import { nativePlugin } from '../native-bridge/native-app';

export type NativePermission = 'notifications' | 'location' | 'backgroundLocation';
export type NativePermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';
export type NativePermissionStates = Record<NativePermission, NativePermissionState>;

const stateSchema = z.enum(['granted', 'denied', 'prompt', 'prompt-with-rationale']);
const statesSchema = z.object({
  notifications: stateSchema,
  location: stateSchema,
  backgroundLocation: stateSchema,
});

const deviceInfoSchema = z.object({
  sdk: z.number(),
  manufacturer: z.string(),
  isUnrestricted: z.boolean(),
});
export type DeviceInfo = z.infer<typeof deviceInfoSchema>;

interface NativePermissionsPlugin {
  checkPermissions: () => Promise<unknown>;
  requestPermissions: (options: { permissions: NativePermission[] }) => Promise<unknown>;
  deviceInfo: () => Promise<unknown>;
  openAppSettings: () => Promise<void>;
}

let plugin: NativePermissionsPlugin | null = null;
const getPlugin = () => (plugin ??= nativePlugin<NativePermissionsPlugin>('NativePermissions'));

export async function checkNativePermissions(): Promise<NativePermissionStates> {
  return statesSchema.parse(await getPlugin().checkPermissions());
}

/** Asks for one permission. Android wants location first, then "all the time" by itself. */
export async function requestNativePermission(
  permission: NativePermission,
): Promise<NativePermissionStates> {
  return statesSchema.parse(await getPlugin().requestPermissions({ permissions: [permission] }));
}

/** The phone's Android version and maker, and whether battery restrictions are already off. */
export async function readDeviceInfo(): Promise<DeviceInfo> {
  return deviceInfoSchema.parse(await getPlugin().deviceInfo());
}

/** Opens Para's page in the phone's Settings. */
export function openAppSettings(): Promise<void> {
  return getPlugin().openAppSettings();
}
