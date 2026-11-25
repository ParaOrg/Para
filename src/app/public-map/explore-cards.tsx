import { useId, useRef } from 'react';

import { Button } from '@/design-system/primitives/button';
import blob from '@/features/routes/cards/route-card-blob-primary.svg';

import { LocationIcon, NavigationOffArt, RouteIcon } from './explore-cards-icons';
import { useDockFoot } from './use-dock-foot';

interface ExploreCardsProps {
  /** "Turn on location…" tapped: locate, or bring the camera back (CommuterLocationHandle). */
  onLocate: () => void;
}

/**
 * What the public map shows while no route list, place or trip is open (Figma "Show These if no
 * route lists is shown", 4852:35066): Ways to explore our app, then Help make Para better. Along
 * the bottom on a phone (FirstTime, 4848:33680), the locate-me column standing 16 over them; in the
 * top-left corner where the cards float (`@float:`, Desktop RouteCard 4852:35445), 384 wide as the
 * route list's panel. They have no ✕: they go when a card opens and come back when it closes.
 */
export function ExploreCards({ onLocate }: ExploreCardsProps) {
  const own = useRef<HTMLDivElement>(null);
  useDockFoot(own);
  return (
    <div
      ref={own}
      data-testid="explore-cards"
      className="absolute inset-x-0 bottom-0 z-10 flex flex-col text-text-on-fill @float:top-0 @float:right-auto @float:bottom-auto @float:w-96"
    >
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
      <Blob />
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

/** The purple card (DonationCard, 4852:35157). */
function DonationCard() {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="relative isolate flex flex-col items-start gap-4 overflow-clip bg-brand-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-route-card-fill @float:pb-4"
    >
      <Blob />
      <NavigationOffArt />
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-lg/6.5 font-bold">
          Help make Para better
        </h2>
        <p className="text-sm/5">Your donation helps us keep improving Para for every commuter.</p>
      </div>
      {/* TODO: link to the donation page once it has an address; no destination exists yet. */}
      <Button variant="secondary" size="small" label="Donate" disabled />
    </section>
  );
}

/**
 * The cards' glow, the RouteCard's Blob file: its body 37 above the card's top and 20 right of
 * its middle, plus the 128 of blur room the file carries on every side. Pixels, as the glow is.
 */
function Blob() {
  return (
    <img
      src={blob}
      alt=""
      className="pointer-events-none absolute -top-[165px] left-[calc(50%+20px)] -z-10 h-[525.538px] w-[795.076px] max-w-none -translate-x-1/2"
    />
  );
}
