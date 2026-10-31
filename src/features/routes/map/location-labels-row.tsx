import { useId } from 'react';

import { Switch } from '@/design-system/primitives/switch';

interface LocationLabelsRowProps {
  /** Whether the basemap's own labels show. */
  areShown: boolean;
  onToggle: () => void;
}

/**
 * The Map Style card's Location Labels row (Figma 4474:6524): its words, and the design
 * system's Switch, which they name. The words are the switch's label, so a tap on them flips it.
 */
export function LocationLabelsRow({ areShown, onToggle }: LocationLabelsRowProps) {
  const labelId = useId();
  const switchId = useId();
  return (
    <div className="flex items-center justify-between rounded-xl bg-surface-secondary px-3 py-2.5">
      <label
        id={labelId}
        htmlFor={switchId}
        className="min-w-0 flex-1 text-sm leading-5 font-medium text-content-primary"
      >
        Location Labels
      </label>
      <Switch
        id={switchId}
        state={areShown ? 'on' : 'rest'}
        labelledBy={labelId}
        onClick={onToggle}
      />
    </div>
  );
}
