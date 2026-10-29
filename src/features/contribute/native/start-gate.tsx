import { BatteryPanel } from './battery-panel';
import { PermissionPanel } from './permission-panel';
import { RefusedPanel } from './refused-panel';
import { useStartGate } from './use-start-gate';
import { TrackingButton } from '../screens/tracking-button';

interface StartGateProps {
  /** Begins the recording, once the phone is ready for it. */
  onStart: () => void;
}

/**
 * The Start bar in the Android app: a tap checks the permissions and, once, the battery help,
 * before the recording begins. Loaded in the app's build only (ready-screen.tsx).
 */
export function StartGate({ onStart }: StartGateProps) {
  const gate = useStartGate(onStart);
  const { step } = gate;
  return (
    <>
      {gate.problem && (
        <p role="alert" className="bg-surface p-3 text-base/6 text-content-primary">
          {gate.problem}
        </p>
      )}
      {step?.kind === 'permission' && (
        <PermissionPanel
          permission={step.permission}
          onContinue={gate.handleContinue}
          onCancel={gate.handleClose}
        />
      )}
      {step?.kind === 'refused' && (
        <RefusedPanel
          permission={step.permission}
          onOpenSettings={gate.handleOpenSettings}
          onRecordAnyway={gate.handleRecordAnyway}
          onClose={gate.handleClose}
        />
      )}
      {step?.kind === 'battery' && (
        <BatteryPanel
          help={step.help}
          onOpenSettings={gate.handleOpenSettings}
          onDone={gate.handleBatteryDone}
        />
      )}
      {!step && <TrackingButton variant="start" onClick={gate.handleStart} />}
    </>
  );
}
