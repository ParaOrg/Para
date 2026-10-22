import { SelectField } from '@/design-system/primitives/select-field';
import { TextField } from '@/design-system/primitives/text-field';
import { isLineMode, MODES, type TransportMode } from '@/features/routes/model/routes';

interface RouteFieldsProps {
  signboard: string;
  mode: TransportMode;
  /** The route's facts belong to the route: locked for a return trip and a retried new route. */
  isLocked: boolean;
  /** An ikot is called by its signboard, so it asks for one; no other route does. */
  isSignboardRequired?: boolean;
  onSignboardChange: (signboard: string) => void;
  onModeChange: (mode: TransportMode) => void;
}

/**
 * The route's facts a save writes, below the save panel's ends and name: the
 * mode, and an ikot's signboard, which is its name. A route's fare note and
 * signboard, when it has them, are kept as they are.
 */
export function RouteFields({
  signboard,
  mode,
  isLocked,
  isSignboardRequired = false,
  onSignboardChange,
  onModeChange,
}: RouteFieldsProps) {
  return (
    <>
      {isSignboardRequired && (
        <div className="mb-3">
          <TextField
            label={
              <>
                Signboard{' '}
                <span className="text-content-disabled">
                  (the ikot&apos;s name, what is painted on the jeep — required)
                </span>
              </>
            }
            aria-required
            disabled={isLocked}
            value={signboard}
            onChange={(e) => onSignboardChange(e.target.value)}
            onClear={() => onSignboardChange('')}
            placeholder="UP – Ikot"
          />
        </div>
      )}

      {/* A line, a train's or the ferry's, comes in by its import, with
          its line named; one drawn here would have none and stop
          nowhere. And a line stays one: its mode decides which hintuans
          both directions hotspot at, and a save re-links only the
          direction saved (servedBy). */}
      <SelectField
        label="Mode"
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
