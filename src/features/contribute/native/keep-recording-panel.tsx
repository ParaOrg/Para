import { Button } from '@/design-system/primitives/button';
import { useFocusHeading } from '@/shared/hooks/use-focus-heading';

import type { KeepRecordingBrand } from './keep-recording-makers';
import { KEEP_RECORDING_STEPS } from './keep-recording-steps';

interface KeepRecordingPanelProps {
  /** The phone's maker's group, for its own steps. */
  brand: KeepRecordingBrand;
  /** The maker's Autostart or battery screen, or Para's own page in Settings. */
  onOpenSettings: () => void;
  onDone: () => void;
}

/**
 * Shown once, at the first Start on a phone whose maker stops background apps: how to let Para
 * keep recording once the app is left, in the steps that maker's settings use. Done starts the
 * ride. Account settings keeps the way back.
 */
export function KeepRecordingPanel({ brand, onOpenSettings, onDone }: KeepRecordingPanelProps) {
  const headingRef = useFocusHeading();
  const steps = KEEP_RECORDING_STEPS[brand];
  return (
    <section
      aria-labelledby="keep-recording-heading"
      className="flex flex-col gap-3 bg-surface p-4 font-sn-pro text-content-primary"
    >
      <h1
        id="keep-recording-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-xl/7 font-extrabold focus:outline-none"
      >
        Keep Para recording
      </h1>
      <p className="text-base/6">
        {steps.phones} phones may stop Para when you leave the app. So your rides keep recording:
      </p>
      <ol className="flex list-decimal flex-col gap-1 pl-6 text-base/6">
        {steps.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="flex gap-3">
        <Button variant="primary" label="Open settings" onClick={onOpenSettings} />
        <Button variant="secondary" label="Done" onClick={onDone} />
      </div>
    </section>
  );
}
