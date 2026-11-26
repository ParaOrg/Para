import { useId, useRef } from 'react';

import type { Snap } from '@/shared/ui/sheet-gesture';
import { cn } from '@/shared/utils/cn';

import { CardBlob } from './card-blob';
import { DonationCard } from './donation-card';
import { LocationIcon, RouteIcon } from './explore-cards-icons';
import { useExploreSheet, type ExploreRest } from './use-explore-sheet';

interface ExploreCardsProps {
  /** "Turn on location…" tapped: locate, or bring the camera back (CommuterLocationHandle). */
  onLocate: () => void;
  /** Where they rest, as the height the card a tap opens over them takes (useCardStack). */
  onRest?: (snap: Snap, rest: ExploreRest) => void;
  /** Where they stand as they come back: as they were left. */
  startsAt?: ExploreRest;
}

/**
 * What the public map shows while no route list, place or trip is open (Figma "Show These if no
 * route lists is shown", 4852:35066): Ways to explore our app, then Help make Para better. Along
 * the bottom on a phone (FirstCard, 4885:40725 and 4885:41191) they open whole and a drag takes
 * them to Low and back, resting at one or the other (useExploreSheet), the locate-me column
 * standing 16 over them; in the top-left corner where the cards float (`@float:`, Desktop
 * 4879:36258), 384 wide as the route list's panel, still. They have no ✕ and never hide while no
 * card is open: they go when one opens and come back when it closes.
 */
export function ExploreCards({ onLocate, onRest, startsAt }: ExploreCardsProps) {
  const own = useRef<HTMLDivElement>(null);
  const sheet = useExploreSheet(own, onRest, startsAt);
  const isOpen = sheet.rest === 'open';
  return (
    <div
      ref={own}
      data-testid="explore-cards"
      data-rest={sheet.rest}
      onPointerDown={sheet.onPointerDown}
      onFocus={sheet.onFocus}
      className={cn(
        'absolute inset-x-0 bottom-0 z-10 flex touch-none flex-col text-text-on-fill',
        // Its own layer, as BottomSheet's: a move is the compositor's alone, never a repaint of the
        // cards' blurred glows, which a finger on a phone feels as lag.
        'translate-y-(--explore-y) will-change-[translate] motion-reduce:transition-none',
        !sheet.isDragging && 'transition-[translate] duration-sheet ease-enter',
        'has-[[data-explore-toggle]:focus-visible]:ring-2 has-[[data-explore-toggle]:focus-visible]:ring-content-inverse has-[[data-explore-toggle]:focus-visible]:ring-inset',
        '@float:top-0 @float:right-auto @float:bottom-auto @float:w-96 @float:translate-none! @float:touch-auto',
      )}
    >
      {/* No notch is drawn (Figma draws none): the keyboard's way to Low and back. */}
      <button
        type="button"
        data-explore-toggle
        aria-expanded={isOpen}
        onClick={sheet.toggle}
        className="sr-only @float:hidden"
      >
        {isOpen ? 'Lower these cards' : 'Raise these cards'}
      </button>
      <WaysToExplore onLocate={onLocate} />
      <DonationCard />
    </div>
  );
}

/** The blue card (4852:35399): two ways in, the second one a tap away. */
function WaysToExplore({ onLocate }: ExploreCardsProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="relative isolate flex flex-col gap-4 overflow-clip bg-card-jeep-fill p-4 shadow-route-card-fill"
    >
      <CardBlob />
      <h2 id={headingId} className="text-lg/6.5 font-bold">
        Ways to explore our app
      </h2>
      <p className="flex items-start gap-2 text-sm/5 font-medium">
        <RouteIcon />
        Tap highlighted route line to show route lists
      </p>
      <button
        type="button"
        onClick={onLocate}
        className="flex items-start gap-2 text-left text-sm/5 font-medium"
      >
        <LocationIcon />
        Turn on location to see routes near you
      </button>
    </section>
  );
}
