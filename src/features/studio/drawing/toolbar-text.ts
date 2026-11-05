import type { Segment } from '@/shared/utils/geo';

import type { AreaTarget } from './drawing-types';

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

/** How many of a route's stretches go straight (Draw's, or refused by the router): the count's "N straight". */
export function straightCount(segments: readonly (Segment | undefined)[]): number {
  return segments.filter((s) => s?.snap === 'freehand').length;
}

/** Whether the keyboard is a Mac's, whose shortcuts read ⌘ for Ctrl. */
const isMacKeyboard = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

/**
 * A shortcut with the command key, as the computer names it: `Z` reads
 * "Ctrl+Z", or "⌘Z" on a Mac; `Shift+Z` reads "Ctrl+Shift+Z", or "⇧⌘Z".
 */
export function withCommand(keys: string, isMac: boolean = isMacKeyboard()): string {
  if (!isMac) return `Ctrl+${keys}`;
  return keys.startsWith('Shift+') ? `⇧⌘${keys.slice('Shift+'.length)}` : `⌘${keys}`;
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

/** What whyCannotSave reads of a drawing: its points, whether it is a hotspot, and the router's debt. */
export interface SaveableDrawing {
  controlPoints: readonly unknown[];
  area: AreaTarget | null;
  snapping: number;
  unresolved: boolean;
}

/**
 * Why the drawing can't be saved yet, or null when it can: the toolbar's Done
 * and, beside the map, the route form's Save ask the same question. A
 * stand-in still on the line is not road geometry yet, and must not be saved.
 */
export function whyCannotSave(draw: SaveableDrawing): string | null {
  const isArea = draw.area !== null;
  return whyNotDone(
    draw.controlPoints.length,
    isArea ? 3 : 2,
    isArea ? 'corner' : 'point',
    draw.snapping > 0 || draw.unresolved,
  );
}
