/**
 * What the drawing's toolbar says, pure, so tests/unit/toolbar-text-test.mjs can hold it.
 */

/** A route's length as the toolbar shows it: metres under a kilometre, else km to two places. */
export function formatDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(2)} km`;
}

/** A key pressed while typing belongs to the field, never to the map. */
export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

/** The direction being extended: where it runs from and to, and whether its stored line runs the other way. */
export interface ExtendEnds {
  from: string;
  to: string;
  backwards: boolean;
}

/** One of Extend's keep buttons: the part of the stored line it keeps, and what it says. */
export interface KeepOption {
  part: 'start' | 'end';
  label: string;
  hint: string;
}

/**
 * Extend's two keep buttons. They speak in travel order; `part` is the
 * stored line's order, swapped when it runs the other way round.
 */
export function keepOptions(ends: ExtendEnds | null): KeepOption[] {
  const from = ends?.from ?? 'the start';
  const to = ends?.to ?? 'the end';
  const options: KeepOption[] = [
    { part: 'start', label: `Keep ${from} → here`, hint: 'the new route carries on from here' },
    { part: 'end', label: `Keep here → ${to}`, hint: 'the new route joins here' },
  ];
  return options.map((o) =>
    ends?.backwards ? { ...o, part: o.part === 'start' ? 'end' : 'start' } : o,
  );
}

/** The U-turn warning, for one ringed point or several. */
export function uTurnWarning(uTurns: number): string {
  return uTurns === 1
    ? 'The route turns back on itself at the ringed point, drawn in amber. Drag the point to the corner to fix it, or keep it if the jeep really turns there.'
    : 'The route turns back on itself at the ringed points, drawn in amber. Drag a point to its corner to fix it, or keep it if the jeep really turns there.';
}

/** Why Done cannot be pressed yet; null when it can. */
export function whyNotDone(
  points: number,
  minPoints: number,
  noun: string,
  isWaiting: boolean,
): string | null {
  if (points < minPoints) return `Add at least ${minPoints} ${noun}s`;
  return isWaiting ? 'Waiting for the router' : null;
}

/** What the drawing toolbar's hint reads from. */
export interface HintState {
  /** The U-turn warning asked for: it takes the hint's place. */
  uTurnHelp: string | null;
  /** A phone: told what a finger does. */
  isFinger: boolean;
  /** Drawing a hotspot's outline, not a route. */
  isArea: boolean;
  points: number;
}

/**
 * The line over the toolbar: the U-turn warning when asked for; else, on a
 * phone, what a finger does; with a mouse, what its drags and clicks do once
 * there is a point. Dragging and right-clicking are not discoverable on a
 * bare map.
 */
export function drawHint({ uTurnHelp, isFinger, isArea, points }: HintState): string | null {
  if (uTurnHelp !== null) return uTurnHelp;
  if (isFinger) {
    if (isArea) {
      return points === 0
        ? 'Tap the corners of the hotspot'
        : 'Tap to add a corner · tap a corner for options · drag one to move';
    }
    return points === 0
      ? 'Tap where the jeep starts'
      : 'Tap to add · tap a point for options · drag a point to move';
  }
  if (points === 0) return null;
  return isArea
    ? 'drag a corner to move · right-click to delete · click an edge to insert a corner'
    : 'drag a point to move · right-click it to delete · click the line to insert · shift-click a stretch to straighten it · right-click a blue line to follow it to its end';
}
