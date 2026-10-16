import { useState } from 'react';

import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';

import type { useSaveFacts } from './use-save-facts';
import type { SaveInput } from '../data/routes-write';
import { saveRouteAndLinks } from '../data/save-route';
import type { Drawing } from '../drawing/use-drawing';

/** What the save panel's form contributes to a save; the line and its borrow come from the drawing. */
type RouteSaveForm = Pick<
  SaveInput,
  | 'routeId'
  | 'directionId'
  | 'writeRoute'
  | 'signboard'
  | 'mode'
  | 'fareNote'
  | 'headHotspotId'
  | 'tailHotspotId'
  | 'via'
>;

/** The direction a save wrote, by its route's id and its own. */
interface WrittenDirection {
  routeId: string;
  directionId: string;
}

interface UseRouteSaveOptions {
  facts: Pick<
    ReturnType<typeof useSaveFacts>,
    'borrowedForSave' | 'borrowParent' | 'borrowPart' | 'reversed'
  >;
  draw: Pick<Drawing, 'controlPoints' | 'segments'>;
  hotspots: HotspotRow[];
  onSaved: (direction: DirectionRow) => void;
}

/**
 * The save panel's save: busy while it runs, its error as text, and the row
 * it wrote when the link sync after it failed.
 */
export function useRouteSave({ facts, draw, hotspots, onSaved }: UseRouteSaveOptions) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The direction as a save wrote it, when the link sync after it failed.
  // Saves are two steps, not one transaction, so a second press must update
  // the row already written: inserting the route again would meet its own row
  // and be refused as "already drawn".
  const [written, setWritten] = useState<WrittenDirection | null>(null);

  async function save(form: RouteSaveForm) {
    setBusy(true);
    setError(null);
    try {
      // The borrow on the parent's full line, read now if it has not come.
      const borrowed = await facts.borrowedForSave();
      const named = await saveRouteAndLinks(
        {
          ...form,
          reversed: facts.reversed,
          controlPoints: draw.controlPoints,
          segments: draw.segments,
          // A parent deleted since, or a borrowed part redrawn away, borrows nothing.
          borrowedFrom: facts.borrowParent && borrowed > 0 ? facts.borrowParent.id : null,
          borrowedPart: facts.borrowPart,
          borrowedMetres: borrowed > 0 ? Math.round(borrowed) : null,
        },
        hotspots,
        setWritten,
      );
      onSaved(named);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // Only on failure: a save that succeeds closes the panel.
      setBusy(false);
    }
  }

  return { busy, error, setError, written, save };
}
