import { RouteLineLabel, type RouteLineLabelVariant } from './route-line-label';
import { CARD_SURFACE, CARD_SURFACE_PALE } from '../cards/livery-card';
import { TimelineDot } from '../cards/timeline-dot';
import type { Livery } from '../model/liveries';

import './hintuan-label.css';

/**
 * Figma's Property 1: Hintuan, a hintuan along a trip; HintuanEnd, the
 * picked one, where the ride now ends (CodeSign, given a `codeSign`).
 * HintuanStart, a picked start, is HintuanEnd with Start's S on Head
 * Route's green (2026-10-15, green 2026-10-16): Figma draws no start yet.
 */
export type HintuanLabelVariant = 'hintuan' | 'hintuan-end' | 'hintuan-start';

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
  /** The trip's colour, the line's: the dot's ring and the label. */
  livery: Livery;
  /** A train station's sign code, YL06, on the picked one's label (RouteLineLabel). */
  codeSign?: string | null;
  /**
   * Along the rest past a picked hintuan: the dot ringed in the card's pale,
   * as the line is there. Hintuan alone: the picked one ends the ride, so
   * it never sits on the rest.
   */
  isPaled?: boolean;
  /**
   * Given, the name is a button that says this; the marker holding it hears
   * the tap (useMapMarker). The picked hintuan's lets the pick go.
   */
  nameButtonLabel?: string;
}

/**
 * A hintuan on the map, the owner's HintuanLabel (Figma 4068:4791,
 * 2026-10-13): the timeline's own TimelineDot and, 8 to its right and
 * centred on it (respaced 2026-10-16), its RouteLineLabel — Default for
 * Hintuan, End for HintuanEnd, Start for HintuanStart, CodeSignEnd for a
 * picked station.
 *
 * Figma draws every variant's dot as the picked one's; the owner kept the
 * map's (2026-10-13): a hintuan along the trip a hollow ring, the picked
 * one filled, so the pick shows in its circle as well as its E.
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
  const rail = isPaled && !isPicked ? CARD_SURFACE_PALE[livery] : CARD_SURFACE[livery];
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
          <RouteLineLabel
            variant={LABEL_VARIANT[variant]}
            name={name}
            livery={livery}
            codeSign={codeSign}
          />
        </Name>
      )}
    </>
  );
}
