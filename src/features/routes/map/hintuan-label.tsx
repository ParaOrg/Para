import { RouteLineLabel, type RouteLineLabelVariant } from './route-line-label';
import { END_SIGN_LOOK } from '../cards/end-sign';
import { CARD_SURFACE, CARD_SURFACE_PALE } from '../cards/livery-card';
import { TimelineDot } from '../cards/timeline-dot';
import type { Livery } from '../model/liveries';

import './hintuan-label.css';

/**
 * Figma's Property 1: Hintuan, a hintuan along a trip; HintuanEnd, the picked
 * one, where the ride now ends (CodeSign, given a `codeSign`). HintuanStart,
 * a picked start, is HintuanEnd with Start's pill on Head Route's green: Figma
 * draws no start.
 */
type HintuanLabelVariant = 'hintuan' | 'hintuan-end' | 'hintuan-start';

/** The Label each look of the hintuan wears beside its dot. */
const LABEL_VARIANT = {
  hintuan: 'default',
  'hintuan-end': 'end',
  'hintuan-start': 'start',
} as const satisfies Record<HintuanLabelVariant, RouteLineLabelVariant>;

interface HintuanLabelProps {
  variant: HintuanLabelVariant;
  /** The hintuan's name; null, the dot alone (further out than the names show). */
  name: string | null;
  /** The trip's colour, the line's: the dot's ring and the label; a pick's dot wears its sign's colour instead, Start's green or End's red. */
  livery: Livery;
  /** A train station's sign code, YL06, on the picked one's label (RouteLineLabel). */
  codeSign?: string | null;
  /**
   * Outside the ride, along the pale: the dot ringed in the card's pale, as
   * the line is there, and the name the Label's Unselected, at 60% (Figma
   * 4200:13645). Hintuan alone: a pick is the ride's start or end, so it
   * never sits on the pale.
   */
  isPaled?: boolean;
  /**
   * Given, the name is a button that says this; the marker holding it hears
   * the tap (useMapMarker). The picked hintuan's lets the pick go.
   */
  nameButtonLabel?: string;
}

/** The dot's colour: a picked end's is End's red, as Figma's HintuanEnd draws it, a picked start's Start's green; the rest follow the line. */
function railOf(variant: HintuanLabelVariant, livery: Livery, isOutsideRide: boolean): string {
  if (variant === 'hintuan-end') return END_SIGN_LOOK.end.surface;
  if (variant === 'hintuan-start') return END_SIGN_LOOK.start.surface;
  return isOutsideRide ? CARD_SURFACE_PALE[livery] : CARD_SURFACE[livery];
}

/**
 * A hintuan on the map, Figma's HintuanLabel (4068:4791): the timeline's own
 * TimelineDot and, 8 to its right and centred on it, its RouteLineLabel —
 * Default for Hintuan, End for HintuanEnd, Start for HintuanStart,
 * CodeSignEnd for a picked station.
 *
 * Figma draws every variant's dot as the picked one's; the owner keeps the
 * map's: a hintuan along the trip a hollow ring, the picked one filled, so
 * the pick shows in its circle as well as its E.
 *
 * Its parent is the box it sits in, positioned: the dot is in the flow, so
 * a marker sized by it is anchored at its centre, and the label hangs
 * beside it (HintuanPin, StationLabels).
 */
export function HintuanLabel({
  variant,
  name,
  livery,
  codeSign = null,
  isPaled = false,
  nameButtonLabel,
}: HintuanLabelProps) {
  // A pick's dot, the start's as the end's: filled, and never on the pale.
  const isPicked = variant !== 'hintuan';
  const isOutsideRide = isPaled && !isPicked;
  const rail = railOf(variant, livery, isOutsideRide);
  const labelVariant = isOutsideRide ? 'unselected' : LABEL_VARIANT[variant];
  const Name = nameButtonLabel ? 'button' : 'span';
  return (
    <>
      <TimelineDot rail={rail} selected={isPicked} isTucked={false} />
      {name && (
        <Name
          {...(nameButtonLabel ? { type: 'button' as const, 'aria-label': nameButtonLabel } : {})}
          data-part="hintuan-name"
          className="hintuan-label-name absolute top-1/2 left-full ml-2 flex max-w-64"
        >
          <RouteLineLabel variant={labelVariant} name={name} livery={livery} codeSign={codeSign} />
        </Name>
      )}
    </>
  );
}
