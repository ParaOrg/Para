import { isLineMode, MODES, type TransportMode } from '@/features/routes/model/routes';

import { FIELD } from './sheet';

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
        <label className="mb-3 block text-xs font-medium text-neutral-700">
          Signboard{' '}
          <span className="text-neutral-400">
            (the ikot&apos;s name, what is painted on the jeep — required)
          </span>
          <input
            aria-required
            disabled={isLocked}
            value={signboard}
            onChange={(e) => onSignboardChange(e.target.value)}
            placeholder="UP – Ikot"
            className={FIELD}
          />
        </label>
      )}

      <label className="block text-xs font-medium text-neutral-700">
        Mode
        {/* A line, a train's or the ferry's, comes in by its import, with
            its line named; one drawn here would have none and stop
            nowhere. And a line stays one: its mode decides which hintuans
            both directions hotspot at, and a save re-links only the
            direction saved (servedBy). */}
        <select
          disabled={isLocked || isLineMode(mode)}
          value={mode}
          onChange={(e) => onModeChange(e.target.value as TransportMode)}
          className={FIELD}
        >
          {MODES.filter((m) => !isLineMode(m.value) || m.value === mode).map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
