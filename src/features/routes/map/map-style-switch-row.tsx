import { useId } from 'react';

import { Switch } from '@/design-system/primitives/switch';

interface MapStyleSwitchRowProps {
  /** What the switch turns on, its words: the switch's label, so a tap on them flips it. */
  label: string;
  isOn: boolean;
  onToggle: () => void;
}

/**
 * A row of the Map Style card with the design system's Switch (Figma 4474:6524, Location Labels):
 * its words, and the switch they name. Location Labels is one; the studio adds Footbridges.
 */
export function MapStyleSwitchRow({ label, isOn, onToggle }: MapStyleSwitchRowProps) {
  const labelId = useId();
  const switchId = useId();
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface-secondary px-3 py-2.5">
      <label
        id={labelId}
        htmlFor={switchId}
        className="min-w-0 flex-1 text-sm leading-5 font-medium text-content-primary"
      >
        {label}
      </label>
      <Switch id={switchId} state={isOn ? 'on' : 'rest'} labelledBy={labelId} onClick={onToggle} />
    </div>
  );
}
