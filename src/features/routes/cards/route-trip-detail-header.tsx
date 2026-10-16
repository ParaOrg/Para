import { TrainIcon } from '@/shared/ui/route-icons';

import type { Bound } from '../model/rail-codes';
import type { RailLine } from '../model/routes';

export interface RouteTripDetailHeaderProps {
  /** The train's line, its route's routeCode: LRT-1, LRT-2 or MRT-3. */
  line: RailLine;
  /**
   * Which way it runs (railBound), or null when the line's table does not know
   * an end. Undesigned: the code alone, rounded both ends, is Claude's call of
   * 2026-10-16; how it should look is the owner's to say.
   */
  bound: Bound | null;
}

/**
 * The words on the white halves: Figma's Map/Rail/<line>/surface, the line's
 * own colour whatever card it sits on. MRT-3's is yellow, unreadable on
 * white, so its words are Content/primary (the owner's ask of 2026-10-16).
 */
const WORDS = {
  'LRT-1': 'text-map-rail-light-rail-way-one-surface',
  'LRT-2': 'text-map-rail-light-rail-way-two-surface',
  'MRT-3': 'text-content-primary',
} satisfies Record<RailLine, string>;

/** One white half: Figma's padding 2 × 14, text-lg/bold in SN Pro. */
const HALF = 'bg-content-inverse px-3.5 py-0.5 text-lg/7 font-bold whitespace-nowrap';

/**
 * The top of a train trip's card, the owner's RouteTripDetailHeader (Figma
 * 4170:7046, its frame TimelineRouteDetail, 2026-10-16): which railway the
 * rider is looking at and which way it runs — "to create a context which
 * railway they are looking at, if it's LRT-1, MRT, or southbound or
 * northbound". Train first, then the line's code and its bound as two white
 * halves 2 px apart, the card's colour between them the divider, as
 * RouteTripLineDetailPill's are. Trains only: a jeep's card and the ferry's
 * have none (the owner's answer, 2026-10-16).
 *
 * The Train takes the card's words colour, CARD_TEXT, from the card it sits
 * on: Content/inverse, and Content/primary on MRT-3's yellow (the owner's
 * ask of 2026-10-16), at Figma's 65%.
 *
 * The icon is decorative; the halves read "LRT-1, Northbound", the comma
 * there for the pause the gap draws.
 */
export function RouteTripDetailHeader({ line, bound }: RouteTripDetailHeaderProps) {
  return (
    <div
      data-testid="trip-detail-header"
      className="flex w-full items-center gap-2 pt-4 pr-4 pb-2 pl-3 font-sn-pro"
    >
      <span aria-hidden className="size-8 shrink-0 opacity-65 *:size-full">
        <TrainIcon />
      </span>
      <p className={'flex min-w-0 gap-0.5 ' + WORDS[line]}>
        <span className={HALF + ' ' + (bound ? 'rounded-l-full' : 'rounded-full')}>{line}</span>
        {bound && (
          <>
            <span className="sr-only">, </span>
            <span className={HALF + ' rounded-r-full'}>{bound}</span>
          </>
        )}
      </p>
    </div>
  );
}
