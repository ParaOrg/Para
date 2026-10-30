import { useEffect, useRef, useState } from 'react';

import {
  checkNativePermissions,
  openAppSettings,
  readDeviceInfo,
  requestNativePermission,
  type NativePermission,
  type NativePermissionStates,
} from './native-permissions';
import {
  canContinue,
  needsPermissionsScreen,
  permissionRows,
  permissionsOfRow,
  rowState,
  type PermissionRow,
  type PermissionRowView,
} from './permission-rows';
import { neededPermissions } from './permission-steps';
import { markPermissionsScreenSeen } from '../native-bridge/permissions-screen-flag';

const PROBLEM = 'Para could not ask Android. Tap the switch again.';

interface Checked {
  states: NativePermissionStates;
  needed: NativePermission[];
}

export interface PermissionsScreenState {
  /** The rows and their switches, or null while the phone is first checked. */
  rows: PermissionRowView[] | null;
  canContinue: boolean;
  problem: string | null;
  handleSwitch: (row: PermissionRow) => void;
  handleContinue: () => void;
}

/**
 * The permissions screen's state: what Android has granted, and which rows the person refused
 * here. An off switch asks Android, in order (location, then "all the time"); a refused one opens
 * Para's page in Settings, and the phone is checked again when the app comes back to the front.
 * `onDone` once Continue is tapped, or at once if nothing needs asking (and if the first check
 * fails: Start asks for each permission again, so the page goes on).
 */
export function usePermissionsScreen(onDone: () => void): PermissionsScreenState {
  const [checked, setChecked] = useState<Checked | null>(null);
  const [refused, setRefused] = useState<ReadonlySet<PermissionRow>>(new Set());
  const [problem, setProblem] = useState<string | null>(null);
  const isAsking = useRef(false);
  // The first check runs once; a newer onDone is read when it ends.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let isCurrent = true;
    const checkFirst = async () => {
      const needed = neededPermissions((await readDeviceInfo()).sdk);
      const states = await checkNativePermissions();
      if (!isCurrent) return;
      if (needsPermissionsScreen(states, needed)) {
        setChecked({ states, needed });
        return;
      }
      markPermissionsScreenSeen();
      onDoneRef.current();
    };
    checkFirst().catch((error: unknown) => {
      console.error('The permissions screen could not check the phone.', error);
      if (isCurrent) onDoneRef.current();
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  // Back from Settings (or Android's own page for "all the time"): what was fixed shows as on.
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState !== 'visible' || isAsking.current) return;
      checkNativePermissions()
        .then((states) => setChecked((current) => current && { ...current, states }))
        .catch((error: unknown) => {
          console.error('The permissions could not be checked again.', error);
        });
    };
    document.addEventListener('visibilitychange', handleVisible);
    return () => document.removeEventListener('visibilitychange', handleVisible);
  }, []);

  const ask = async (row: PermissionRow, { needed }: Checked) => {
    let states = await checkNativePermissions();
    for (const permission of permissionsOfRow(row, needed)) {
      if (states[permission] === 'granted') continue;
      states = await requestNativePermission(permission);
      if (states[permission] !== 'granted') {
        setRefused((current) => new Set(current).add(row));
        break;
      }
    }
    setChecked({ states, needed });
  };

  const handleSwitch = (row: PermissionRow) => {
    if (!checked || isAsking.current) return;
    const state = rowState(row, checked.states, checked.needed, refused);
    setProblem(null);
    if (state === 'error') {
      openAppSettings().catch((error: unknown) => {
        console.error('Settings could not be opened.', error);
        setProblem(PROBLEM);
      });
      return;
    }
    // Android cannot take a permission back from inside the app; an on switch stays on.
    if (state === 'on') return;
    isAsking.current = true;
    ask(row, checked)
      .catch((error: unknown) => {
        console.error('Android could not be asked for the permission.', error);
        setProblem(PROBLEM);
      })
      .finally(() => {
        isAsking.current = false;
      });
  };

  const handleContinue = () => {
    markPermissionsScreenSeen();
    onDone();
  };

  return {
    rows: checked
      ? permissionRows(checked.needed).map((row) => ({
          row,
          state: rowState(row, checked.states, checked.needed, refused),
        }))
      : null,
    canContinue: checked ? canContinue(checked.states, checked.needed, refused) : false,
    problem,
    handleSwitch,
    handleContinue,
  };
}
