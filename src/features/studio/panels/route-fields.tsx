import { SelectField } from '@/design-system/primitives/select-field';
import { TextField } from '@/design-system/primitives/text-field';
import { isLineMode, MODES, type TransportMode } from '@/features/routes/model/routes';

interface RouteFieldsProps {
  signboard: string;
  mode: TransportMode;
  /** The route's facts belong to the route: locked for a return trip and a retried new route. */
  isLocked: boolean;
  /** An ikot is called by its name, stored as its signboard (ADR 0005); no other route asks for one. */
  isIkot?: boolean;
  onSignboardChange: (signboard: string) => void;
  onModeChange: (mode: TransportMode) => void;
}

/**
 * The route's facts a save writes, besides its ends and via: the Transportation mode, and an
 * ikot's Ikot name, stored as its signboard. A route's fare note and signboard, when it has them,
 * are kept as they are.
 */
export function RouteFields({
  signboard,
  mode,
  isLocked,
  isIkot = false,
  onSignboardChange,
  onModeChange,
}: RouteFieldsProps) {
  return (
    <>
      {isIkot && (
        <TextField
          label="Ikot name"
          aria-required
          disabled={isLocked}
          value={signboard}
          onChange={(e) => onSignboardChange(e.target.value)}
          onClear={() => onSignboardChange('')}
          placeholder="UP – Ikot"
          data-testid="save-ikot-name"
        />
      )}

      {/* A line, a train's or the ferry's, comes in by its import, with
          its line named; one drawn here would have none and stop
          nowhere. And a line stays one: its mode decides which hintuans
          both directions hotspot at, and a save re-links only the
          direction saved (servedBy). */}
      <SelectField
        label="Transportation mode"
        disabled={isLocked || isLineMode(mode)}
        value={mode}
        onChange={(e) => onModeChange(e.target.value as TransportMode)}
      >
        {MODES.filter((m) => !isLineMode(m.value) || m.value === mode).map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </SelectField>
    </>
  );
}
