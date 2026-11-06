import { cn } from '@/shared/utils/cn';

import {
  BLOB_PLACE,
  CARD_BLOB,
  CARD_SHADOW,
  CARD_SHADOW_SELECTED,
  CARD_SURFACE,
  CARD_TEXT,
} from './livery-card';
import { RouteEndPointBar } from './route-end-point-bar';
import { RouteMode } from './route-mode';
import { MODE_LABEL, groupByMode, type ModeGroup } from './route-modes';
import type { Livery } from '../model/liveries';
import type { Vehicle } from '../model/vehicles';

/**
 * A place and the routes that leave it, in its mode's colours (RouteCard, 4629:22776): what they
 * ride at the top (RouteMode), the place in SN Pro Bold 28/32, and a row for each place it goes to
 * (RouteEndPointBar, Medium 17/24), joined to it by a tree line. A card lists one mode as a rule;
 * rows of another mode, where the data mixes them, stack below under their own mode. How each
 * livery paints the card (surface, words, glow, shadow) is livery-card.ts, shared with the trip
 * card it opens.
 *
 * In a list, a run of cards of one mode shows the mode on its first card only (`showsMode`,
 * RouteCardStackedList, 4633:19780); the rows still carry it for a screen reader.
 *
 * Figma's State: Rest, or Selected, pressed in under the Selected shadow while the map lights its
 * routes alone; nothing else on the card changes. A row opens its trip straight away; a tap
 * anywhere else on the card selects it, or lets it go. Which card is Selected, one at a time, is
 * the caller's to keep. The card carries no pesos: the trip's Expected fare does.
 *
 * A row's State: Rest, or Pressed, the row in the card's darker step while the finger is down on
 * it (ROW_PRESSED, shared with the trip's timeline): the one highlight a card shows of its own.
 */

interface EndPoint {
  /** Which direction the row opens. */
  id: string;
  /** Figma's routeDirection: the place this direction goes to. */
  routeDirection: string;
  /** What the direction rides: the mode it is grouped under (Modes). */
  vehicle: Vehicle | null;
}

interface RouteCardProps {
  livery: Livery;
  /** Figma's State. */
  state: 'rest' | 'selected';
  /** Figma's Route Origin: the place the card's routes leave from. */
  routeOrigin: string;
  /** One row per direction leaving it, in the order given. */
  endPoints: readonly EndPoint[];
  /** Whether the mode is drawn at the top: false on a card that follows one of its mode. */
  showsMode?: boolean;
  /** A tap on the card outside its rows: select it, or let it go. */
  onSelect: () => void;
  /** A row was tapped: open that direction. */
  onPick: (id: string) => void;
  /**
   * What the suites call the card and its parts — `<testId>-origin`, its name
   * `<testId>-select`, its rows `<testId>-item` — `chooser` in the route
   * list, `card` in a hotspot's card, the names the suites already knew.
   */
  testId: 'chooser' | 'card';
}

export function RouteCard({
  livery,
  state,
  routeOrigin,
  endPoints,
  showsMode = true,
  onSelect,
  onPick,
  testId,
}: RouteCardProps) {
  const selected = state === 'selected';
  // Each mode's rows stand under its own mode, so rows of one mode can move up past another's.
  const [first, ...others] = groupByMode(endPoints);
  const rows = (group: ModeGroup<EndPoint>) => (
    <ul
      aria-label={group.vehicle ? MODE_LABEL[group.vehicle] : undefined}
      className="flex w-full flex-col"
    >
      {group.items.map((e, index) => (
        <li key={e.id}>
          {/* `relative`: positioned after the name's stretched target, so drawn over it. */}
          <RouteEndPointBar
            routeDirection={e.routeDirection}
            on={livery}
            size="medium"
            position={index === group.items.length - 1 ? 'bottom' : 'top'}
            data-testid={`${testId}-item`}
            data-direction={e.id}
            onClick={() => onPick(e.id)}
            className="relative"
          />
        </li>
      ))}
    </ul>
  );
  return (
    <div
      data-testid={`${testId}-origin`}
      data-livery={livery}
      data-state={state}
      className={cn(
        'relative isolate flex w-full flex-col items-start gap-2 overflow-clip border-y-0-6 pt-4 pb-2.5 font-sn-pro',
        CARD_SURFACE[livery],
        CARD_TEXT[livery],
      )}
    >
      <img
        src={CARD_BLOB[livery].src}
        alt=""
        aria-hidden
        className={cn(BLOB_PLACE, CARD_BLOB[livery].className)}
      />
      {showsMode && first?.vehicle && (
        <div className="flex px-4">
          <RouteMode vehicle={first.vehicle} livery={livery} />
        </div>
      )}
      <div className="flex w-full flex-col">
        <div className="flex w-full px-4">
          {/* The name is the card's own target, stretched over all of it; the rows are drawn over
              that, so they keep their own taps. Long names wrap. At a sheet's Low, one line of it
              (sheetGesture's LOW_PX). */}
          <button
            type="button"
            data-testid={`${testId}-select`}
            aria-pressed={selected}
            onClick={onSelect}
            className="w-full text-left text-3xl/8 font-bold after:absolute after:inset-0 sheet-low:line-clamp-1"
          >
            {routeOrigin}
          </button>
        </div>
        {first && rows(first)}
      </div>
      {others.map((group) => (
        <div
          key={group.vehicle ? MODE_LABEL[group.vehicle] : 'no-mode'}
          className="flex w-full flex-col gap-2"
        >
          {group.vehicle && (
            <div className="flex px-4">
              <RouteMode vehicle={group.vehicle} livery={livery} />
            </div>
          )}
          {rows(group)}
        </div>
      ))}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0',
          selected ? CARD_SHADOW_SELECTED[livery] : CARD_SHADOW[livery],
        )}
      />
    </div>
  );
}
