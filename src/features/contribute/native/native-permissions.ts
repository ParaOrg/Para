import * as z from 'zod/mini';

import { lazyPlugin } from '../native-bridge/native-app';
import { PLUGIN_NAMES } from '../native-bridge/native-contract';

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
  /** The phone's own location switch. */
  isLocationOn: z.boolean(),
});
export type DeviceInfo = z.infer<typeof deviceInfoSchema>;

interface NativePermissionsPlugin {
  checkPermissions: () => Promise<unknown>;
  requestPermissions: (options: { permissions: NativePermission[] }) => Promise<unknown>;
  deviceInfo: () => Promise<unknown>;
  openAppSettings: () => Promise<void>;
  openLocationSettings: () => Promise<void>;
  openAutostartSettings: () => Promise<void>;
  checkLocationOn: () => Promise<unknown>;
}

const getPlugin = lazyPlugin<NativePermissionsPlugin>(PLUGIN_NAMES.nativePermissions);

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

/**
 * Opens the maker's Autostart or battery screen for Para (MIUI's Autostart, and the like), or
 * Para's own page in Settings on a phone that has none.
 */
export function openAutostartSettings(): Promise<void> {
  return getPlugin().openAutostartSettings();
}

/** Opens the phone's Location settings, where its switch is. */
export function openLocationSettings(): Promise<void> {
  return getPlugin().openLocationSettings();
}

const locationSettingSchema = z.object({ location: z.enum(['on', 'off', 'unknown']) });
export type LocationSetting = z.infer<typeof locationSettingSchema>['location'];

/**
 * Whether the phone's location is on. Off, Google's "Turn on location?" dialog shows, and its
 * answer is the answer; "off" too when it cannot show. "unknown" without Google Play services.
 */
export async function checkLocationOn(): Promise<LocationSetting> {
  return locationSettingSchema.parse(await getPlugin().checkLocationOn()).location;
}
