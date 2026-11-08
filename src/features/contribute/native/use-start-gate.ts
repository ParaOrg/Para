import { useRef, useState } from 'react';

import { hasAskedBatteryDialog, markBatteryDialogAsked } from './battery-dialog-flag';
import { hasSeenKeepRecording, markKeepRecordingSeen } from './keep-recording-flag';
import { stopsBackgroundApps } from './keep-recording-makers';
import {
  askBatteryUnrestricted,
  checkNativePermissions,
  openAppSettings,
  openAutostartSettings,
  openLocationSettings,
  readDeviceInfo,
  requestNativePermission,
  type DeviceInfo,
  type NativePermission,
} from './native-permissions';
import { firstMissing, neededPermissions } from './permission-steps';

export type GateStep =
  | { kind: 'permission'; permission: NativePermission }
  | { kind: 'refused'; permission: NativePermission }
  /** Once, on a phone whose maker stops background apps: Keep Para recording. */
  | { kind: 'keep-recording' }
  /** The phone's location switch is off: no ride can record until it is on. */
  | { kind: 'location-off' };

const PROBLEM = 'Para could not check the phone’s permissions. Try Start again.';

export interface StartGate {
  /** The panel to show above Start, or null when Start is plain. */
  step: GateStep | null;
  problem: string | null;
  handleStart: () => void;
  handleContinue: () => void;
  handleRecordAnyway: () => void;
  handleKeepRecordingDone: () => void;
  handleOpenSettings: () => void;
  handleOpenAutostartSettings: () => void;
  handleOpenLocationSettings: () => void;
  handleClose: () => void;
}

/**
 * What stands between a tap on Start and the recording in the app: the permissions, asked for in
 * order with a reason each (notifications, location, then "all the time"); once, Android's own
 * dialog to let Para run in the background; and, once, Keep Para recording on a phone whose maker
 * stops background apps. A refusal says what still works; the contributor may record anyway unless
 * it is location. With the phone's location switch off no ride starts: the card says so, and the
 * next Start checks again.
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

  const startOrKeepRecording = async (info: DeviceInfo) => {
    // Once, at the first Start: Android's own dialog to let Para run on in the background. A no,
    // or a phone with no such dialog, still starts the ride.
    if (!info.isBatteryUnrestricted && !hasAskedBatteryDialog()) {
      markBatteryDialogAsked();
      await askBatteryUnrestricted().catch((error: unknown) => {
        console.warn('Android would not ask to let Para run in the background.', error);
      });
    }
    // Shown whether or not battery restrictions are off: the maker's Autostart is a switch of its
    // own, which Android cannot report, and it alone stops a ride when the app is left.
    if (stopsBackgroundApps(info.manufacturer) && !hasSeenKeepRecording()) {
      setStep({ kind: 'keep-recording' });
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
    else if (!info.isLocationOn) setStep({ kind: 'location-off' });
    else await startOrKeepRecording(info);
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

  const handleKeepRecordingDone = () => {
    markKeepRecordingSeen();
    setStep(null);
    onStart();
  };

  const handleOpenSettings = () => {
    openAppSettings().catch(fail);
  };

  const handleOpenAutostartSettings = () => {
    openAutostartSettings().catch(fail);
  };

  const handleOpenLocationSettings = () => {
    openLocationSettings().catch(fail);
  };

  return {
    step,
    problem,
    handleStart,
    handleContinue,
    handleRecordAnyway,
    handleKeepRecordingDone,
    handleOpenSettings,
    handleOpenAutostartSettings,
    handleOpenLocationSettings,
    handleClose: () => setStep(null),
  };
}
