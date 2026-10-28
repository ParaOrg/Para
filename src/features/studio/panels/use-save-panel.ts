import { useState } from 'react';

import type { HotspotRow } from '@/features/routes/model/hotspots';
import {
  isClosedLine,
  type RouteRow,
  type TransportMode,
  type DirectionRow,
} from '@/features/routes/model/routes';

import { loopSaveRefusal, saveRefusal } from './save-checks';
import { useRouteSave } from './use-route-save';
import { useSaveEnds } from './use-save-ends';
import { useSaveFacts } from './use-save-facts';
import { returnTripNotices } from '../drawing/loop-closing';
import type { Drawing } from '../drawing/use-drawing';

export interface UseSavePanelOptions {
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
  /** A save stored as a draft (STUDIO_DRAFTS). */
  onDrafted?: (directionId: string) => void;
  /** Hears of a place made from the pickers, so the map's own list is read again. */
  onPlaceSaved?: () => void;
}

/**
 * The save panel's state and its submit: the ends (useSaveEnds), the route's
 * facts as typed, what the line is (useSaveFacts), what is locked, and the
 * save itself (useRouteSave), refused first in words when it cannot go.
 */
export function useSavePanel({
  draw,
  existing,
  route,
  slotReversed = null,
  hotspots: savedHotspots,
  directions = [],
  onSaved,
  onDrafted,
  onPlaceSaved,
}: UseSavePanelOptions) {
  const parent = existing?.route ?? route;
  const ends = useSaveEnds({
    savedHotspots,
    existing,
    parent,
    line: draw.controlPoints,
    directions,
    onPlaceSaved,
  });
  const { hotspots, headId, tailId, head, tail, headPlace, tailPlace } = ends;

  const [signboard, setSignboard] = useState(parent?.signboard ?? '');
  const [mode, setMode] = useState<TransportMode>(parent?.mode ?? 'jeepney');
  // Kept as the route has it: the form no longer asks for one.
  const fareNote = parent?.fareNote ?? '';
  const [via, setVia] = useState(parent?.via ?? '');
  // An ikot is made one or not and stays so (0021): an edit, a return trip or
  // a retried save keeps what the route is. A new line starts ticked when it
  // was closed on its own first point.
  const [isLoop, setIsLoop] = useState(() =>
    parent ? parent.isLoop === true : isClosedLine(draw.line),
  );

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
    isLoop,
    signboard,
  });
  // A return trip that stops short of where the other way began or ended says so, and saves anyway.
  const loop = existing
    ? []
    : returnTripNotices(directions, route?.id ?? null, hotspots, draw.line, slotReversed);
  const { busy, error, setError, written, save } = useRouteSave({
    facts,
    draw,
    hotspots,
    onSaved,
    onDrafted,
  });

  // A return trip fills its route's slot and leaves the route as it is; Edit
  // route may change the route's facts, for both its directions. A new
  // route's are fixed once a save has written it: the retry finishes that
  // row and would ignore a changed end.
  const routeLocked = !existing && (!!parent || !!written);
  // The toggle is locked by more than the route's facts: Edit route keeps it too.
  const loopLocked = !!existing || routeLocked;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const refusal = isLoop
      ? loopSaveRefusal({
          signboard,
          gapM: facts.loopGapM,
          placesCount: facts.loopPlacesCount,
          signboardTaken: facts.signboardTaken,
        })
      : saveRefusal({
          headId,
          tailId,
          headPlace,
          tailPlace,
          endsTaken: facts.endsTaken,
          turnedRound: facts.turnedRound,
        });
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
      headHotspotId: isLoop ? null : headId,
      tailHotspotId: isLoop ? null : tailId,
      isLoop,
      via,
    });
  }

  return {
    parent,
    ends,
    signboard,
    setSignboard,
    mode,
    setMode,
    via,
    setVia,
    isLoop,
    setIsLoop,
    facts,
    loop,
    busy,
    error,
    routeLocked,
    loopLocked,
    submit,
  };
}
