import { cn } from '@/shared/utils/cn';

import { BatteryPanel } from './battery-panel';
import { PermissionPanel } from './permission-panel';
import { RefusedPanel } from './refused-panel';
import { useStartGate } from './use-start-gate';
import { StartBar } from '../screens/start-bar';

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
        // Over the Start bar, 2rem clear of it, so the bar's rounded corners do not cover it.
        <p
          role="alert"
          className={cn('bg-surface p-3 text-base/6 text-content-primary', !step && 'mb-8')}
        >
          {gate.problem}
        </p>
      )}
      {/* In the bar's place the panels keep clear of Android's navigation buttons themselves. */}
      {step && (
        <div className="pb-[env(safe-area-inset-bottom)]">
          {step.kind === 'permission' && (
            <PermissionPanel
              permission={step.permission}
              onContinue={gate.handleContinue}
              onCancel={gate.handleClose}
            />
          )}
          {step.kind === 'refused' && (
            <RefusedPanel
              permission={step.permission}
              onOpenSettings={gate.handleOpenSettings}
              onRecordAnyway={gate.handleRecordAnyway}
              onClose={gate.handleClose}
            />
          )}
          {step.kind === 'battery' && (
            <BatteryPanel
              help={step.help}
              onOpenSettings={gate.handleOpenSettings}
              onDone={gate.handleBatteryDone}
            />
          )}
        </div>
      )}
      {!step && <StartBar onClick={gate.handleStart} />}
    </>
  );
}
