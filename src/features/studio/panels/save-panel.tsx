import { useMemo, useRef, useState } from 'react';

import { DirectionTimeline, passesThrough } from '@/features/routes/cards/direction-timeline';
import { hotspotLabel, type HotspotRow } from '@/features/routes/model/hotspots';
import type { RouteRow, TransportMode, DirectionRow } from '@/features/routes/model/routes';
import type { LngLat } from '@/shared/utils/geo';

import { NewPlaceForm } from './new-place-form';
import { NEW_PLACE_KEY, PlacePicker } from './place-picker';
import { boxFor, endsByHead, groupPlaces, guessEnds, placeOfBox } from './places';
import { RouteFields } from './route-fields';
import { saveRefusal } from './save-checks';
import { SaveNotices } from './save-notices';
import { FIELD, FOOTER, OVERLAY, PANEL } from './sheet';
import { useRouteSave } from './use-route-save';
import { useSaveFacts } from './use-save-facts';
import { returnTripNotices } from '../drawing/loop-closing';
import type { Drawing } from '../drawing/use-drawing';

interface SavePanelProps {
  draw: Drawing;
  /** The direction being edited, when this is an edit rather than a new save. */
  existing: DirectionRow | null;
  /** The parent route, when adding another direction to a route that exists. */
  route: RouteRow | null;
  /**
   * Which way round the route's empty slot runs, when there is one: the
   * direction this line is being drawn *for*. Null when there is no slot to
   * fill. Not inferred from the line — a return trip drawn from the wrong end
   * must not overwrite the direction that is already there.
   */
  slotReversed?: boolean | null;
  /** Every hotspot, for the two end pickers and for generating the name. */
  hotspots: HotspotRow[];
  /**
   * Every saved direction: for what an Extend borrowed from, for noticing
   * that the chosen ends already make a route whose empty slot this fills,
   * and, in Edit route, for refusing ends another route already has.
   */
  directions?: DirectionRow[];
  onSaved: (v: DirectionRow) => void;
  /** Hears of a place made from the pickers, so the map's own list is read again. */
  onPlaceSaved?: () => void;
  onCancel: () => void;
}

/**
 * The one form in the app. Appears once, at ✓ Done.
 *
 * It asks for a route's two ends, not its name: the name is generated from
 * them and cannot be typed over, so a hotspot renamed once fixes every route
 * through it. Nothing here is required except the two ends — the signboard is
 * an observed fact and can wait until it is known.
 *
 * Its pieces live beside it: the places and the first guess at the ends
 * (`places.ts`), what the line is (`useSaveFacts`), why a save is refused
 * (`save-checks.ts`), the save itself (`useRouteSave`), the two ends
 * (`PlacePicker`), the route's facts (`RouteFields`), the notices
 * (`SaveNotices`) and the phone layout's classes (`sheet.ts`).
 */
export function SavePanel({
  draw,
  existing,
  route,
  slotReversed = null,
  hotspots: savedHotspots,
  directions = [],
  onSaved,
  onPlaceSaved,
  onCancel,
}: SavePanelProps) {
  const parent = existing?.route ?? route;
  // The places made here, kept beside the saved ones until the map's list has them.
  const [made, setMade] = useState<HotspotRow[]>([]);
  const hotspots = useMemo(
    () => [...savedHotspots, ...made.filter((m) => !savedHotspots.some((s) => s.id === m.id))],
    [savedHotspots, made],
  );
  const [making, setMaking] = useState<'Head' | 'Tail' | null>(null);
  const headSelect = useRef<HTMLSelectElement>(null);
  const tailSelect = useRef<HTMLSelectElement>(null);
  const line = draw.controlPoints;
  const places = useMemo(() => groupPlaces(hotspots), [hotspots]);
  // Where a picked end's box is looked for: the end of the line nearer the
  // route's head, whichever way it was drawn.
  const headNow = existing
    ? hotspots.find((s) => s.id === existing.route.headHotspotId)
    : undefined;
  const [nearHead, nearTail] = endsByHead(line, headNow);

  const [signboard, setSignboard] = useState(parent?.signboard ?? '');
  const [mode, setMode] = useState<TransportMode>(parent?.mode ?? 'jeepney');
  const [fareNote, setFareNote] = useState(parent?.fareNote ?? '');
  const [via, setVia] = useState(parent?.via ?? '');
  // The ends are the route's: a return trip takes them as they are, and Edit
  // route starts from them; a new route's are guessed from where the line
  // actually starts and finishes, once, and corrected by hand when the guess
  // is wrong.
  const [firstGuess] = useState(() => guessEnds(places, hotspots, line, directions));
  const [headId, setHeadId] = useState(parent?.headHotspotId ?? firstGuess[0]);
  const [tailId, setTailId] = useState(parent?.tailHotspotId ?? firstGuess[1]);

  const head = hotspots.find((s) => s.id === headId);
  const tail = hotspots.find((s) => s.id === tailId);
  const headPlace = head ? placeOfBox(places, head.id) : undefined;
  const tailPlace = tail ? placeOfBox(places, tail.id) : undefined;

  const pickPlace = (key: string, to: LngLat | undefined) => {
    const place = places.find((p) => p.key === key);
    return place ? boxFor(place, to) : '';
  };

  // What this line is, as the panel and the save see it.
  const facts = useSaveFacts({
    draw,
    existing,
    parent,
    slotReversed,
    hotspots,
    directions,
    head,
    tail,
    headId,
    tailId,
    via,
    mode,
  });
  const {
    reversed,
    wrongWayRound,
    sameEnds,
    endsTaken,
    turnedRound,
    borrowParent,
    borrowedM,
    name,
    direction,
    preview,
  } = facts;
  // A return trip that stops short of where the other way began or ended says so, and saves anyway.
  const loop = existing
    ? []
    : returnTripNotices(directions, route?.id ?? null, hotspots, draw.line, slotReversed);
  const { busy, error, setError, written, save } = useRouteSave({ facts, draw, hotspots, onSaved });

  // A return trip fills its route's slot and leaves the route as it is; Edit
  // route may change the route's facts, for both its directions. A new
  // route's are fixed once a save has written it: the retry finishes that
  // row and would ignore a changed end.
  const routeLocked = !existing && (!!parent || !!written);

  /** Back to the picker that asked for the form. */
  const closeMaking = () => {
    const picker = making === 'Head' ? headSelect : tailSelect;
    setMaking(null);
    picker.current?.focus();
  };

  // The new place becomes that end: the box its place is reached by, as picking it would.
  const handlePlaceSaved = (place: HotspotRow) => {
    setMade((previous) => [...previous, place]);
    const next = groupPlaces([...hotspots, place]);
    const placeNow = placeOfBox(next, place.id);
    const isHead = making === 'Head';
    const box = placeNow ? boxFor(placeNow, isHead ? nearHead : nearTail) : place.id;
    if (isHead) setHeadId(box);
    else setTailId(box);
    onPlaceSaved?.();
    closeMaking();
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const refusal = saveRefusal({ headId, tailId, headPlace, tailPlace, endsTaken, turnedRound });
    if (refusal) {
      setError(refusal);
      return;
    }
    await save({
      routeId: written?.routeId ?? parent?.id ?? null,
      directionId: written?.directionId ?? existing?.id ?? null,
      writeRoute: !!existing,
      signboard,
      mode,
      fareNote,
      headHotspotId: headId,
      tailHotspotId: tailId,
      via,
    });
  }

  return (
    <div className={OVERLAY}>
      <form onSubmit={submit} className={PANEL}>
        <h2 className="text-base font-medium text-neutral-900">
          {existing ? 'Update this direction' : route ? 'Draw the return trip' : 'Save this route'}
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          {draw.controlPoints.length} points · {(draw.metres / 1000).toFixed(2)} km
          {routeLocked && ' · the ends belong to the route, so both directions share them'}
          {existing &&
            " · the ends, via, signboard, mode and fare note are the route's: a change here is a change to both directions"}
        </p>
        <SaveNotices
          segments={draw.segments}
          uTurns={draw.uTurns}
          loop={loop}
          hotspotsCount={hotspots.length}
          wrongWay={
            wrongWayRound && head && tail
              ? {
                  direction,
                  startsAt: hotspotLabel(reversed ? head : tail),
                  from: hotspotLabel(reversed ? tail : head),
                }
              : null
          }
          borrowed={
            borrowParent && borrowedM > 0 ? { metres: borrowedM, parent: borrowParent } : null
          }
          sameEnds={sameEnds}
          direction={direction}
        />

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PlacePicker
            label="Head"
            hint="(where the jeeps wait)"
            places={places}
            value={headPlace?.key ?? ''}
            isDisabled={routeLocked}
            onChange={(key) =>
              key === NEW_PLACE_KEY ? setMaking('Head') : setHeadId(pickPlace(key, nearHead))
            }
            ref={headSelect}
            testId="save-head"
          />
          <PlacePicker
            label="Tail"
            hint="(the far end)"
            places={places}
            value={tailPlace?.key ?? ''}
            isDisabled={routeLocked}
            onChange={(key) =>
              key === NEW_PLACE_KEY ? setMaking('Tail') : setTailId(pickPlace(key, nearTail))
            }
            ref={tailSelect}
            testId="save-tail"
          />
        </div>

        {making && nearHead && nearTail && (
          <NewPlaceForm
            key={making}
            end={making}
            centre={making === 'Head' ? nearHead : nearTail}
            defaultKind={making === 'Head' ? 'terminal' : 'hintuan'}
            hotspots={hotspots}
            directions={directions}
            onSaved={handlePlaceSaved}
            onCancel={closeMaking}
          />
        )}

        {/* What the line passes, by the rule the save will apply: seen first, stored the same. */}
        {head && tail && (
          <div data-testid="save-timeline" className="mt-3 rounded-lg bg-neutral-50 px-3 py-2">
            <p className="text-xs font-medium text-neutral-600">
              {preview.between.length === 0
                ? 'Passes through no hintuan yet — draw one across the road and it appears here'
                : `${passesThrough(preview.between.length)}, in this order`}
            </p>
            <DirectionTimeline timeline={preview} />
          </div>
        )}

        <label className="mt-3 block text-xs font-medium text-neutral-700">
          Via <span className="text-neutral-400">(only if another route shares both ends)</span>
          <input
            disabled={routeLocked}
            value={via}
            onChange={(e) => setVia(e.target.value)}
            placeholder="Zabarte"
            className={FIELD}
          />
        </label>

        <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-600">
          <span className="text-xs text-neutral-400">This line is the direction</span>
          <br />
          <strong data-testid="save-direction" className="text-neutral-900">
            {direction || '—'}
          </strong>
          <br />
          <span className="text-xs text-neutral-500">
            {parent ? 'of the route ' : 'of a new route, '}
            <span data-testid="save-name" className="font-medium text-neutral-700">
              {name || '—'}
            </span>
          </span>
          <br />
          <span className="text-[11px] text-neutral-400">
            {existing
              ? 'Both names are generated from the two ends: pick another place above to change them.'
              : 'Both names are generated from the two ends. Rename a hotspot to change them.'}
          </span>
        </p>

        <hr className="my-4 border-neutral-200" />

        <RouteFields
          signboard={signboard}
          mode={mode}
          fareNote={fareNote}
          isLocked={routeLocked}
          onSignboardChange={setSignboard}
          onModeChange={setMode}
          onFareNoteChange={setFareNote}
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className={FOOTER}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 ring-1 ring-neutral-300"
          >
            Back to map
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Saving…' : existing ? 'Update' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
