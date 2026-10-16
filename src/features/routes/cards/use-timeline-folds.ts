import { useEffect, useRef, useState } from 'react';

import { timelineFolds, type FoldPart, type TimelineFold } from './timeline-folds';
import type { EndRow } from './timeline-row-role';

/**
 * A trip timeline's folds (TimelineRouteDetail): which rows fold into which
 * fold, which folds are open, whether the folded rows' insides are drawn,
 * and the keyboard's focus handed to a fold as its row folds away under it.
 * `listRef` goes on the timeline's <ol>.
 */
export function useTimelineFolds(
  hintuans: readonly { id: string }[],
  start: string | null,
  picked: string | null,
  endPicked: EndRow | null,
) {
  const [isAllOpen, setIsAllOpen] = useState(false);
  // Whether the fold has ever been opened on this card: until then its rows
  // are their bare <li>s, the hidden insides left out. A trip with 10 to 25
  // hintuans would otherwise draw all of them, invisible, as it opens, for a
  // fold most riders never open. Opened once, they stay drawn as long as the
  // card is up, so they close in view and open again. Set with the fold's own
  // state, in the same render, so the first opening moves as every other;
  // and as a pick is let go (below), so the rows it folds back close in
  // view too.
  const [everOpened, setEverOpened] = useState(false);
  // Once a start or an end is picked, the rows around it fold apart, before
  // and after, each its own fold (timelineFolds). Nothing folds under the
  // finger as a pick is made: picked from the open list, both stay open, and
  // Set as start keeps them as they were. When the pick is let go, they fold
  // back as they were before it, so the row just used folds away again
  // instead of leaving the whole list open.
  const hasPick = start !== null || picked !== null;
  const [hadPick, setHadPick] = useState(hasPick);
  const [openParts, setOpenParts] = useState({ before: false, after: false });
  if (hadPick !== hasPick) {
    setHadPick(hasPick);
    if (hasPick) setOpenParts({ before: isAllOpen, after: isAllOpen });
  }
  // A pick let go keeps the rows it folds back drawn: the row just tapped
  // closes in view, and the keyboard's focus on it passes to its fold (the
  // effect below) rather than to nothing as its button leaves.
  const [lastPicks, setLastPicks] = useState({ start, picked, endPicked });
  if (
    lastPicks.start !== start ||
    lastPicks.picked !== picked ||
    lastPicks.endPicked !== endPicked
  ) {
    // The start let go, or a hintuan end let go that neither became the
    // start (Set as start) nor gave way to an end row: an end row's own
    // button, which keeps the focus, never folds.
    const isLetGo =
      (lastPicks.start !== null && start === null) ||
      (lastPicks.picked !== null &&
        picked === null &&
        lastPicks.picked !== start &&
        endPicked === null);
    setLastPicks({ start, picked, endPicked });
    if (isLetGo) setEverOpened(true);
  }
  const isOpen = (part: FoldPart) => (part === 'all' ? isAllOpen : openParts[part]);
  const toggle = (part: FoldPart) => {
    if (part === 'all') setIsAllOpen((o) => !o);
    else setOpenParts((p) => ({ ...p, [part]: !p[part] }));
    // The first tap opens it (it starts folded): from then on, drawn.
    setEverOpened(true);
  };
  const folds = timelineFolds(hintuans, start, picked, endPicked);
  const foldOf = new Map(folds.flatMap((f) => f.rowIds.map((id) => [id, f] as const)));
  const isShown = (id: string) => {
    const fold = foldOf.get(id);
    return !fold || isOpen(fold.part);
  };
  /** The fold whose row sits after this row, the last of its rows; else undefined. */
  const foldEndingAt = (id: string): TimelineFold | undefined => {
    const fold = foldOf.get(id);
    return fold?.rowIds.at(-1) === id ? fold : undefined;
  };
  // A row folded away under the keyboard's focus — a pick let go folds back —
  // hands the focus to the fold that now holds it, so it never sits on a row
  // that can't be seen.
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const row = document.activeElement?.closest('[data-testid="trip-hintuan"]');
    const id = row && listRef.current?.contains(row) ? row.getAttribute('data-hintuan') : null;
    const fold = id === null ? undefined : foldOf.get(id);
    if (!fold || isOpen(fold.part)) return;
    listRef.current
      ?.querySelector<HTMLButtonElement>(`[data-testid="trip-fold"][data-part="${fold.part}"]`)
      ?.focus();
  });
  return { listRef, folds, isOpen, toggle, isShown, foldEndingAt, everOpened };
}
