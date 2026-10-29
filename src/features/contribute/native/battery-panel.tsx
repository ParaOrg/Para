import { Button } from '@/design-system/primitives/button';

import type { BatteryHelp } from './battery-steps';
import { useFocusHeading } from '../common/use-focus-heading';

interface BatteryPanelProps {
  help: BatteryHelp;
  onOpenSettings: () => void;
  onDone: () => void;
}

/** Shown once on a phone whose maker stops background apps: how to let Para keep recording. */
export function BatteryPanel({ help, onOpenSettings, onDone }: BatteryPanelProps) {
  const headingRef = useFocusHeading();
  return (
    <section
      aria-labelledby="battery-heading"
      className="flex flex-col gap-3 bg-surface p-4 font-sn-pro text-content-primary"
    >
      <h1
        id="battery-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-xl/7 font-extrabold focus:outline-none"
      >
        Let Para run in the background
      </h1>
      <p className="text-base/6">
        {help.maker} phones can stop apps that run with the screen off, which would cut a recording
        short. To prevent it: {help.steps}
      </p>
      <div className="flex gap-3">
        <Button variant="primary" label="Open settings" onClick={onOpenSettings} />
        <Button variant="secondary" label="Done" onClick={onDone} />
      </div>
    </section>
  );
}
