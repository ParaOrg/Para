import type { Place } from './places';
import { FIELD } from './sheet';

interface PlacePickerProps {
  /** 'Head' or 'Tail'. */
  label: string;
  /** What that end is, beside the label: '(where the jeeps wait)', '(the far end)'. */
  hint: string;
  places: Place[];
  /** The picked place's key, '' for none. */
  value: string;
  /** The ends belong to the route, so a return trip and a retried new route keep them. */
  disabled: boolean;
  onChange: (placeKey: string) => void;
  testId: 'save-head' | 'save-tail';
}

/**
 * One of the save panel's two ends: a place, not a box — the panel turns the
 * picked place into the box the route references (split from save-panel.tsx,
 * 2026-10-14).
 */
export function PlacePicker({
  label,
  hint,
  places,
  value,
  disabled,
  onChange,
  testId,
}: PlacePickerProps) {
  return (
    <label className="block text-xs font-medium text-neutral-700">
      {label} <span className="text-neutral-400">{hint}</span>
      <select
        required
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD}
        data-testid={testId}
      >
        <option value="">Pick a place…</option>
        {places.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  );
}
