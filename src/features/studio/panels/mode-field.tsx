import { SelectField } from '@/design-system/primitives/select-field';
import { lineOfMode } from '@/features/routes/model/busway';
import { isLineMode, type TransportMode } from '@/features/routes/model/routes';

import { modeChoices } from './mode-choices';

interface ModeFieldProps {
  mode: TransportMode;
  /**
   * The route's facts belong to the route: locked for a return trip and a retried new route, and
   * a saved line's mode for good.
   */
  isLocked: boolean;
  onChange: (mode: TransportMode) => void;
}

/** The route's Transportation mode, the last of Route Information's fields. */
export function ModeField({ mode, isLocked, onChange }: ModeFieldProps) {
  // A line stays one: its mode decides which hintuans both directions stop at, and a save re-links
  // only the direction saved (servedBy). A train or the ferry is imported a line; the Carousel,
  // drawn here, is locked once saved (isLocked). What else is offered is modeChoices'.
  const choices = modeChoices(mode);
  const handleChange = (value: string) => {
    const picked = choices.find((m) => m.value === value);
    if (picked) onChange(picked.value);
  };
  return (
    <SelectField
      label="Transportation mode"
      disabled={isLocked || (isLineMode(mode) && lineOfMode(mode) === null)}
      value={mode}
      onChange={(e) => handleChange(e.target.value)}
    >
      {choices.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </SelectField>
  );
}
