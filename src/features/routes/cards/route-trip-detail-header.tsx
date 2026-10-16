import { VehicleIcon } from './vehicle-icon';
import type { Livery } from '../model/liveries';
import type { RailLine } from '../model/routes';
import type { Vehicle } from '../model/vehicles';

interface RouteTripDetailHeaderProps {
  vehicle: Vehicle;
  /**
   * The way that is showing (wayWord): Papunta or Pabalik, or a train's
   * bound. Null when a train's line table does not know an end: then the
   * vehicle alone, rounded both ends.
   */
  way: string | null;
  /** The card's colour, the words' on every vehicle but a train. */
  livery: Livery;
}

/**
 * A train's words: Figma's Map/Rail/<line>/surface, the line's own colour
 * whatever card it sits on, a jeep-coloured one too. MRT-3's is yellow,
 * unreadable on white, so its words are Content/primary.
 */
const LINE_WORDS = {
  'LRT-1': 'text-map-rail-light-rail-way-one-surface',
  'LRT-2': 'text-map-rail-light-rail-way-two-surface',
  'MRT-3': 'text-content-primary',
} satisfies Record<RailLine, string>;

/**
 * Every other vehicle's words: its card's surface. Figma's jeep, bus, e-jeep
 * and ferry variants draw them in LRT-1's green, the Default's copied; the
 * card's own colour is used instead, as a train's are its line's. MRT-3's
 * yellow card gives Content/primary, as a train's does.
 */
const CARD_WORDS = {
  red: 'text-card-red-surface',
  orange: 'text-card-orange-surface',
  violet: 'text-card-violet-surface',
  rose: 'text-card-rose-surface',
  fuchsia: 'text-card-fuchsia-surface',
  pink: 'text-card-pink-surface',
  'light-rail-way-one': 'text-map-rail-light-rail-way-one-surface',
  'light-rail-way-two': 'text-map-rail-light-rail-way-two-surface',
  'metro-rail-way-three': 'text-content-primary',
} satisfies Record<Livery, string>;

const isLine = (vehicle: Vehicle): vehicle is RailLine => vehicle in LINE_WORDS;

/** One white half: Figma's padding 2 × 14, text-lg/bold in SN Pro. */
const HALF = 'bg-content-inverse px-3.5 py-0.5 text-lg/7 font-bold whitespace-nowrap';

/**
 * The top of a trip's card, Figma's RouteTripDetailHeader (4170:7046 for
 * trains; every vehicle's in 4181:10844): what the rider is on and which way
 * it runs — which railway, LRT-1 or MRT, and southbound or northbound; for a
 * jeep, bus or ferry, Papunta or Pabalik, while SWITCH names the other way.
 * The vehicle first, then its name and the way as two white halves 2 px apart,
 * the card's colour between them the divider, as RouteTripLineDetailPill's are.
 *
 * The icon takes the card's words colour, CARD_TEXT, from the card it sits on:
 * Content/inverse, and Content/primary on MRT-3's yellow, every vehicle at 70
 * (Figma's --opacity/70). Figma's frame draws the Train in Content/primary; it
 * is kept white like the others.
 *
 * The icon is decorative; the halves read "LRT-1, Northbound", the comma
 * there for the pause the gap draws.
 */
export function RouteTripDetailHeader({ vehicle, way, livery }: RouteTripDetailHeaderProps) {
  const words = isLine(vehicle) ? LINE_WORDS[vehicle] : CARD_WORDS[livery];
  return (
    <div
      data-testid="trip-detail-header"
      className="flex w-full items-center gap-2 pt-4 pr-4 pb-2 pl-3 font-sn-pro"
    >
      <span aria-hidden className="size-8 shrink-0 opacity-70 *:size-full">
        <VehicleIcon vehicle={vehicle} />
      </span>
      <p className={'flex min-w-0 gap-0.5 ' + words}>
        <span className={HALF + ' ' + (way ? 'rounded-l-full' : 'rounded-full')}>{vehicle}</span>
        {way && (
          <>
            <span className="sr-only">, </span>
            <span className={HALF + ' rounded-r-full'}>{way}</span>
          </>
        )}
      </p>
    </div>
  );
}
