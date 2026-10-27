import type { Ref } from 'react';

import { SelectField } from '@/design-system/primitives/select-field';

import type { Place } from './places';

/** The last option's value: not a place, the way to make one here. */
export const NEW_PLACE_KEY = '+new-place';

interface PlacePickerProps {
  ref?: Ref<HTMLSelectElement>;
  /** 'Head' or 'Tail'. */
  label: string;
  /** What that end is, beside the label: '(where the jeeps wait)', '(the far end)'. */
  hint: string;
  places: Place[];
  /** The picked place's key, '' for none. */
  value: string;
  /** The ends belong to the route, so a return trip and a retried new route keep them. */
  isDisabled: boolean;
  onChange: (placeKey: string) => void;
  testId: 'save-head' | 'save-tail';
}

/**
 * One of the save panel's two ends: a place, not a box — the panel turns the
 * picked place into the box the route references. Its last option, NEW_PLACE_KEY,
 * asks the panel for a form to make a place at that end of the line.
 */
export function PlacePicker({
  ref,
  label,
  hint,
  places,
  value,
  isDisabled,
  onChange,
  testId,
}: PlacePickerProps) {
  return (
    <SelectField
      ref={ref}
      label={
        <>
          {label} <span className="text-content-disabled">{hint}</span>
        </>
      }
      required
      disabled={isDisabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid={testId}
    >
      <option value="">Pick a place…</option>
      {places.map((p) => (
        <option key={p.key} value={p.key}>
          {p.label}
        </option>
      ))}
      {!isDisabled && <option value={NEW_PLACE_KEY}>+ New place here…</option>}
    </SelectField>
  );
}
