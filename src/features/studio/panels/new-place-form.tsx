import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import type { HotspotKind, HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import type { LngLat } from '@/shared/utils/geo';

import { NEW_PLACE_SIDE_M, squareBox } from './new-place';
import { FIELD } from './sheet';
import { useNewPlaceSave } from './use-new-place-save';

interface NewPlaceFormProps {
  /** 'Head' or 'Tail': which end this place is for. */
  end: 'Head' | 'Tail';
  /** The line's first point for the head, its last for the tail: the box is centred here. */
  centre: LngLat;
  /** Terminal for a head, where the jeeps wait; Hintuan for a tail. */
  defaultKind: HotspotKind;
  hotspots: HotspotRow[];
  directions: DirectionRow[];
  onSaved: (place: HotspotRow) => void;
  onCancel: () => void;
}

const KINDS: { kind: HotspotKind; label: string }[] = [
  { kind: 'terminal', label: 'Terminal' },
  { kind: 'hintuan', label: 'Hintuan' },
];

/**
 * A new place for one end of the route, made inside the save panel so the
 * drawn line is left alone: a small square box at the line's end, saved as the
 * hotspot panel saves one. Not a `<form>`: it stands inside the panel's, so
 * Enter in a field saves the place, not the route, and Escape closes this and
 * nothing else.
 */
export function NewPlaceForm({
  end,
  centre,
  defaultKind,
  hotspots,
  directions,
  onSaved,
  onCancel,
}: NewPlaceFormProps) {
  const ids = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [informal, setInformal] = useState('');
  const [kind, setKind] = useState<HotspotKind>(defaultKind);
  const ring = useMemo(() => squareBox(centre), [centre]);
  const { isBusy, isReady, error, save } = useNewPlaceSave({ ring, hotspots, directions, onSaved });

  useEffect(() => nameRef.current?.focus(), []);

  const handleSave = () => void save({ kind, name, informal });
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    } else if (
      e.key === 'Enter' &&
      e.target instanceof HTMLInputElement &&
      e.target.type !== 'radio'
    ) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    // The keys are caught on the group, whichever field has focus.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape and Enter are caught once on the labelled group, whichever field has focus; every control inside is itself reachable and operable
    <div
      role="group"
      aria-labelledby={`${ids}-title`}
      onKeyDown={handleKeyDown}
      className="mt-3 rounded-lg bg-neutral-50 px-3 py-3 ring-1 ring-neutral-200"
    >
      <h3 id={`${ids}-title`} className="text-sm font-medium text-neutral-900">
        New place for the {end.toLowerCase()}
      </h3>
      <p className="mt-1 text-xs text-neutral-500">
        A small square box ({NEW_PLACE_SIDE_M} m a side) at the line&rsquo;s{' '}
        {end === 'Head' ? 'first' : 'last'} point. Reshape it later like any hotspot.
      </p>

      <label htmlFor={`${ids}-name`} className="mt-3 block text-xs font-medium text-neutral-700">
        Ground name <span className="text-neutral-400">(as written on the ground)</span>
      </label>
      <input
        id={`${ids}-name`}
        ref={nameRef}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={FIELD}
      />

      <label
        htmlFor={`${ids}-informal`}
        className="mt-3 block text-xs font-medium text-neutral-700"
      >
        Stop name <span className="text-neutral-400">(what people say — optional)</span>
      </label>
      <input
        id={`${ids}-informal`}
        value={informal}
        onChange={(e) => setInformal(e.target.value)}
        className={FIELD}
      />

      <fieldset className="mt-3">
        <legend className="text-xs font-medium text-neutral-700">Kind</legend>
        <div className="mt-1 flex gap-4">
          {KINDS.map((option) => (
            <label key={option.kind} className="flex items-center gap-1.5 text-sm text-neutral-700">
              <input
                type="radio"
                name={`${ids}-kind`}
                checked={kind === option.kind}
                onChange={() => setKind(option.kind)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isBusy}
          className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 ring-1 ring-neutral-300"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isBusy || !isReady}
          className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isBusy ? 'Saving…' : 'Save place'}
        </button>
      </div>
    </div>
  );
}
