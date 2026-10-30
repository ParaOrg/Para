import type { SwitchState } from '@/design-system/primitives/switch';

import type { NativePermission, NativePermissionStates } from './native-permissions';
import { firstMissing } from './permission-steps';

/** A row of the permissions screen. Location carries "all the time" with it, on Android 10+. */
export type PermissionRow = 'notification' | 'location';

/** A row as the screen shows it: which permission, and its switch. */
export interface PermissionRowView {
  row: PermissionRow;
  state: SwitchState;
}

/** Each row's permissions, in the order Android has to be asked for them. */
const ROW_PERMISSIONS = {
  notification: ['notifications'],
  location: ['location', 'backgroundLocation'],
} satisfies Record<PermissionRow, NativePermission[]>;

const ROW_ORDER: readonly PermissionRow[] = ['notification', 'location'];

/** The permissions a row asks for on this phone (`needed` is neededPermissions' answer). */
export function permissionsOfRow(
  row: PermissionRow,
  needed: readonly NativePermission[],
): NativePermission[] {
  return ROW_PERMISSIONS[row].filter((permission) => needed.includes(permission));
}

/** The rows this phone shows: Notification only on Android 13+, where the permission exists. */
export function permissionRows(needed: readonly NativePermission[]): PermissionRow[] {
  return ROW_ORDER.filter((row) => permissionsOfRow(row, needed).length > 0);
}

/**
 * A row's switch: on once all its permissions are granted; refused (red, "Tap to fix") once the
 * person said no on this screen, or when Android will not ask again ('denied'); otherwise off.
 */
export function rowState(
  row: PermissionRow,
  states: NativePermissionStates,
  needed: readonly NativePermission[],
  refused: ReadonlySet<PermissionRow>,
): SwitchState {
  const permissions = permissionsOfRow(row, needed);
  if (permissions.every((permission) => states[permission] === 'granted')) return 'on';
  if (refused.has(row) || permissions.some((permission) => states[permission] === 'denied')) {
    return 'error';
  }
  return 'rest';
}

/**
 * Continue shows once location itself is granted and every row has an answer, on or refused: a
 * refused notification or "all the time" can be fixed later, and Start still asks then.
 */
export function canContinue(
  states: NativePermissionStates,
  needed: readonly NativePermission[],
  refused: ReadonlySet<PermissionRow>,
): boolean {
  if (states.location !== 'granted') return false;
  return permissionRows(needed).every((row) => rowState(row, states, needed, refused) !== 'rest');
}

/** Whether the screen has anything to ask: a needed permission not granted yet. */
export function needsPermissionsScreen(
  states: NativePermissionStates,
  needed: readonly NativePermission[],
): boolean {
  return firstMissing(states, needed) !== null;
}

/**
 * Asks Android for a row's permissions in order (location before "all the time"), skipping any
 * already granted and stopping at the first refusal. `states` is the phone's answer before asking.
 */
export async function askRow(
  row: PermissionRow,
  needed: readonly NativePermission[],
  states: NativePermissionStates,
  request: (permission: NativePermission) => Promise<NativePermissionStates>,
): Promise<{ states: NativePermissionStates; isRefused: boolean }> {
  let current = states;
  for (const permission of permissionsOfRow(row, needed)) {
    if (current[permission] === 'granted') continue;
    current = await request(permission);
    if (current[permission] !== 'granted') return { states: current, isRefused: true };
  }
  return { states: current, isRefused: false };
}
