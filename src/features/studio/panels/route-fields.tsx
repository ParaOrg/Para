import { isLineMode, MODES, type TransportMode } from '@/features/routes/model/routes';

import { FIELD } from './sheet';

interface RouteFieldsProps {
  signboard: string;
  mode: TransportMode;
  fareNote: string;
  /** The route's facts belong to the route: locked for a return trip and a retried new route. */
  isLocked: boolean;
  /** An ikot is called by its signboard, so it is required there; elsewhere it is an observed fact. */
  isSignboardRequired?: boolean;
  onSignboardChange: (signboard: string) => void;
  onModeChange: (mode: TransportMode) => void;
  onFareNoteChange: (fareNote: string) => void;
}

/**
 * The route's facts a save writes, below the save panel's ends and name: the
 * signboard, the mode and the fare note.
 */
export function RouteFields({
  signboard,
  mode,
  fareNote,
  isLocked,
  isSignboardRequired = false,
  onSignboardChange,
  onModeChange,
  onFareNoteChange,
}: RouteFieldsProps) {
  return (
    <>
      <label className="block text-xs font-medium text-neutral-700">
        Signboard{' '}
        <span className="text-neutral-400">
          {isSignboardRequired
            ? "(the ikot's name, what is painted on the jeep — required)"
            : '(what is painted on the jeep — optional)'}
        </span>
        <input
          aria-required={isSignboardRequired}
          disabled={isLocked}
          value={signboard}
          onChange={(e) => onSignboardChange(e.target.value)}
          placeholder={isSignboardRequired ? 'UP – Ikot' : 'Fairview – Tala'}
          className={FIELD}
        />
      </label>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <label className="block text-xs font-medium text-neutral-700">
          Fare note <span className="text-neutral-400">(optional)</span>
          <input
            disabled={isLocked}
            value={fareNote}
            onChange={(e) => onFareNoteChange(e.target.value)}
            placeholder="₱13 first 4 km"
            className={FIELD}
          />
        </label>
      </div>
    </>
  );
}
