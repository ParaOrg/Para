import { useEffect, useRef, type ReactNode } from 'react';

import { AlertCircleIcon } from '@/design-system/primitives/field-icons';
import { LocationIcon } from '@/design-system/primitives/location-icon';
import { ToastHost } from '@/shared/ui/toast-host';
import { useToast } from '@/shared/ui/use-toast';

import type { MapNoteGiven } from './map-note';
import type { PageProblem, PageProblemIcon } from './page-problem';
import { SCREEN_AWAKE_PROBLEM } from './screen-awake-problem';
import { FlagStopIcon } from '../screens/flag-stop-icon';

const ICONS = {
  location: <LocationIcon />,
  warning: <AlertCircleIcon />,
} satisfies Record<PageProblemIcon, ReactNode>;

interface PageToastsProps {
  /** The recorder's problem as it stands, or null: fixed, it is taken away. */
  problem: PageProblem | null;
  /** A recording runs with the screen free to sleep: the wake lock was refused. */
  isScreenFreeToSleep: boolean;
  /** The map locator's note, or null: said as a problem of its own id. */
  mapNote: MapNoteGiven | null;
  /** How many stops have been flagged on the page: each one more says "Stop flagged". */
  stopsFlagged: number;
}

interface FlagsSaidProps {
  stopsFlagged: number;
  /** A problem stands: a flag now is not said, then or later, as it would only wait behind it. */
  isQuiet: boolean;
}

interface ProblemsSaidProps {
  /** Every problem as the page has it now; one gone from here was fixed. */
  problems: readonly PageProblem[];
}

/**
 * The contributor page's problems, as toasts at the top (shared/ui's ToastHost): one at a time,
 * each until ✕ or until it is fixed. One closed with ✕ is not said again until it has cleared and
 * come back, or says something else. A flagged stop is said too, briefly. Loaded the first time
 * the page has one of them to say.
 */
export function PageToasts({
  problem,
  isScreenFreeToSleep,
  mapNote,
  stopsFlagged,
}: PageToastsProps) {
  // The recorder and the locator both say what is wrong with location, under one id: one toast.
  // The recorder's, when both have one, as it knows more; either going leaves the other's.
  const noteProblem: PageProblem | null =
    mapNote && mapNote.note.id !== problem?.id
      ? { ...mapNote.note, icon: 'location', timesAsked: mapNote.timesGiven }
      : null;
  const problems = [problem, noteProblem, isScreenFreeToSleep ? SCREEN_AWAKE_PROBLEM : null].filter(
    (each) => each !== null,
  );
  return (
    <ToastHost>
      <ProblemsSaid problems={problems} />
      <FlagsSaid stopsFlagged={stopsFlagged} isQuiet={problems.length > 0} />
    </ToastHost>
  );
}

/**
 * "Stop flagged", a small info toast that leaves by itself. Under one id, so a flag while it shows
 * says it again in place, its clock started afresh, and never stacks a second.
 */
function FlagsSaid({ stopsFlagged, isQuiet }: FlagsSaidProps) {
  const { showToast } = useToast();
  // The count it last said at: the same count, as on a render with no new flag, says nothing.
  const saidAt = useRef(0);
  // Tells the host's queue, which is told rather than rendered.
  useEffect(() => {
    if (stopsFlagged <= saidAt.current) return;
    saidAt.current = stopsFlagged;
    // The host shows one toast at a time: behind a standing problem it would come late, if ever.
    if (isQuiet) return;
    showToast({ id: 'stop-flagged', kind: 'info', icon: <FlagStopIcon />, title: 'Stop flagged' });
  }, [stopsFlagged, isQuiet, showToast]);
  return null;
}

function ProblemsSaid({ problems }: ProblemsSaidProps) {
  const { showToast, hideToast } = useToast();
  // What each problem last said, by its id: said once, and taken away once it is gone.
  const said = useRef(new Map<string, string>());
  // Syncs the host's queue, which is told rather than rendered, with the problems as they stand.
  useEffect(() => {
    const now = new Set(problems.map((problem) => problem.id));
    for (const id of said.current.keys()) {
      if (now.has(id)) continue;
      said.current.delete(id);
      hideToast(id);
    }
    for (const problem of problems) {
      // Asked again counts as new words: said again in place, never a second toast.
      const words = `${problem.title}\n${problem.body ?? ''}\n${problem.timesAsked ?? 0}`;
      const wereSaid = said.current.get(problem.id);
      if (wereSaid === words) continue;
      // New words for a problem already said, or asked again: the host keeps a waiting toast's
      // first words, so the old one goes and the new one is said in its place.
      if (wereSaid !== undefined) hideToast(problem.id);
      said.current.set(problem.id, words);
      showToast({
        id: problem.id,
        kind: 'problem',
        icon: ICONS[problem.icon],
        title: problem.title,
        body: problem.body,
      });
    }
  }, [problems, showToast, hideToast]);
  return null;
}
