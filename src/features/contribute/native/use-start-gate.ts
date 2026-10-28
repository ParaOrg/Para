import { useRef, useState } from 'react';

import { hasSeenBatteryNotice, markBatteryNoticeSeen } from './battery-notice-flag';
import { batteryHelpFor, type BatteryHelp } from './battery-steps';
import {
  checkNativePermissions,
  openAppSettings,
  readDeviceInfo,
  requestNativePermission,
  type DeviceInfo,
  type NativePermission,
} from './native-permissions';
import { firstMissing, neededPermissions } from './permission-steps';

export type GateStep =
  | { kind: 'permission'; permission: NativePermission }
  | { kind: 'refused'; permission: NativePermission }
  | { kind: 'battery'; help: BatteryHelp };

const PROBLEM = 'Para could not check the phone’s permissions. Try Start again.';

export interface StartGate {
  /** The panel to show above Start, or null when Start is plain. */
  step: GateStep | null;
  problem: string | null;
  handleStart: () => void;
  handleContinue: () => void;
  handleRecordAnyway: () => void;
  handleBatteryDone: () => void;
  handleOpenSettings: () => void;
  handleClose: () => void;
}

/**
 * What stands between a tap on Start and the recording in the app: the permissions, asked for in
 * order with a reason each (notifications, location, then "all the time"), and, once, the
 * battery help for a maker known to stop background apps. A refusal says what still works; the
 * contributor may record anyway unless it is location.
 */
export function useStartGate(onStart: () => void): StartGate {
  const [step, setStep] = useState<GateStep | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // Permissions the contributor chose to go without, for this Start only.
  const waived = useRef(new Set<NativePermission>());

  const fail = (error: unknown) => {
    console.error('The start check failed.', error);
    setProblem(PROBLEM);
    setStep(null);
  };

  const startOrShowBattery = (info: DeviceInfo) => {
    const help = batteryHelpFor(info.manufacturer);
    if (help && !info.isUnrestricted && !hasSeenBatteryNotice()) {
      setStep({ kind: 'battery', help });
      return;
    }
    setStep(null);
    onStart();
  };

  const checkAll = async () => {
    const info = await readDeviceInfo();
    const needed = neededPermissions(info.sdk).filter(
      (permission) => !waived.current.has(permission),
    );
    const missing = firstMissing(await checkNativePermissions(), needed);
    if (missing) setStep({ kind: 'permission', permission: missing });
    else startOrShowBattery(info);
  };

  const handleStart = () => {
    waived.current = new Set();
    setProblem(null);
    checkAll().catch(fail);
  };

  const handleContinue = () => {
    if (step?.kind !== 'permission') return;
    const { permission } = step;
    requestNativePermission(permission)
      .then((states) => {
        if (states[permission] === 'granted') return checkAll();
        setStep({ kind: 'refused', permission });
      })
      .catch(fail);
  };

  const handleRecordAnyway = () => {
    if (step?.kind !== 'refused') return;
    waived.current.add(step.permission);
    checkAll().catch(fail);
  };

  const handleBatteryDone = () => {
    markBatteryNoticeSeen();
    setStep(null);
    onStart();
  };

  const handleOpenSettings = () => {
    openAppSettings().catch(fail);
  };

  return {
    step,
    problem,
    handleStart,
    handleContinue,
    handleRecordAnyway,
    handleBatteryDone,
    handleOpenSettings,
    handleClose: () => setStep(null),
  };
}
