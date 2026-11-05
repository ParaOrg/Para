import { SelectField } from '@/design-system/primitives/select-field';
import { isLineMode, MODES, type TransportMode } from '@/features/routes/model/routes';

interface ModeFieldProps {
  mode: TransportMode;
  /** The route's facts belong to the route: locked for a return trip and a retried new route. */
  isLocked: boolean;
  onChange: (mode: TransportMode) => void;
}

/** The route's Transportation mode, the last of Route Information's fields. */
export function ModeField({ mode, isLocked, onChange }: ModeFieldProps) {
  // A line, a train's or the ferry's, comes in by its import, with its line named; one drawn here
  // would have none and stop nowhere. And a line stays one: its mode decides which hintuans both
  // directions stop at, and a save re-links only the direction saved (servedBy).
  const choices = MODES.filter((m) => !isLineMode(m.value) || m.value === mode);
  const handleChange = (value: string) => {
    const picked = choices.find((m) => m.value === value);
    if (picked) onChange(picked.value);
  };
  return (
    <SelectField
      label="Transportation mode"
      disabled={isLocked || isLineMode(mode)}
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
