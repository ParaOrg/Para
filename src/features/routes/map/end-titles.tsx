import type { MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import type { LngLat } from '@/shared/utils/geo';

import { rideEnds, type Ride } from './direction-arrows';
import {
  RouteLineEndingsLabel,
  type RouteLineEndingsLabelVariant,
} from './route-line-endings-label';
import { useMapMarker, useMarkerElement } from './use-map-marker';
import { CARD_SURFACE, CARD_SURFACE_PALE } from '../cards/livery-card';
import { TimelineDot } from '../cards/timeline-dot';
import type { Livery } from '../model/liveries';
import { stationCode } from '../model/rail-codes';
import { isRailLine } from '../model/routes';

import './end-titles.css';

/**
 * Each lit ride's ends: a circle at each, and over the named ones the
 * owner's RouteLineEndingsLabels (Figma 3848:12135, 2026-09-30, redrawn
 * 2026-10-13), a pill over the circle, its pointer at the circle, in place
 * of the plain name the map wrote beside it.
 *
 * The circle is the hintuan's own — the card timeline's TimelineDot, as the
 * dots along the line (StationLabels) and the picked hintuan's circle
 * (HintuanPin) are — ringed in what the line wears: the card's colour
 * (`livery`), the selected blue with none, and the card's pale at the far
 * end of a ride past a picked hintuan, along the rest drawn in it (Ride.pale,
 * useRideRest), as the dots along the rest are; and at the start too, since
 * a ride's start could be picked (2026-10-15). The owner's ask of
 * 2026-10-12: "make the end and last hintuan circle similar to the hintuan
 * circle so it's consistent, and reusable"; until then the ends were a
 * circle layer of the map's (direction-arrows.ts), a 2 px ring half the
 * line wide, like nothing else drawn on it, with its own GL program to warm
 * (warm-programs.ts). 24 across at every zoom, since the pills show at
 * every zoom.
 *
 * Each name says which end it is: a Head Route, Start's green with its
 * circled S, where a ride starts; a Tail Route, End's circled E in the
 * line's colour, where it goes; white words on both, and the pointer the
 * same (RouteLineEndingsLabel; End in the brand's blue until the owner's
 * redrawing of 2026-10-13). They read as the RouteCard does (2026-10-01):
 * where a ride starts, the top of its timeline, is the card's title; where
 * it goes is one of the card's rows. The words Start and End stood over the
 * names from 2026-10-02 until his icons of 2026-10-12. Every lit line's
 * ends are marked since his "the rules for RouteLineEndingsLabel must be
 * applicable to these RouteLine" (2026-10-13), a list's in the selected
 * blue too: they kept plain names from 2026-10-02 ("there are too many").
 * A ride a picked hintuan stops short ends there, End's E before the
 * hintuan's name (HintuanPin), so its own tail keeps its name without one,
 * the label's Default in the line's colour (the owner's ask, 2026-10-02);
 * a ride started at a picked hintuan, Start's S on its pin, leaves its
 * head the same way (2026-10-15). Either is an end on the pale (`paled`).
 * A start picked alone, no ride yet, leaves both its trip's ends without
 * them, lit, the start's pin the one S (the owner, 2026-10-16: "Nothing
 * yet, just the S"). A place two rides share is named by the first to reach it
 * (`rideEnds`), so a trip's change of ride is the earlier ride's tail, as
 * it sits under the start on the timeline; the other ride's end there keeps
 * its circle, bare.
 *
 * DOM markers, like the picked hintuan's circle (HintuanPin), 256 across at
 * most, as the pin's label is. Each place is named once
 * (`rideEnds`). A list of twenty routes is forty of these, which the
 * cheap-phone plan should count, as it counts the dots along a trip.
 *
 * Given `onPick`, a pill whose ride says which hotspot it ends at is a
 * button: a tap opens that place (the owner's ask, 2026-10-01), and the map
 * beneath never hears it (markerTap.ts). Without one, or a hotspot, it takes
 * no taps, and a tap on it reaches the line or the box beneath; the circle
 * never takes one, as the picked hintuan's does not.
 *
 * Given `onTrip`, a Tail Route that one lit ride alone goes to opens that
 * ride's trip instead (the owner's ask, 2026-10-01): its TimelineRouteDetailCard,
 * its line lit, as the card's row of the same arrow does. Where two rides
 * go, the place's own card lists both, so the tap opens that. How a
 * focused or pressed pill looks is the owner's to design; until then it is
 * the browser's own focus ring.
 */
export function EndTitles({
  map,
  rides,
  livery = null,
  onPick,
  onTrip,
}: {
  map: MapLibreMap;
  rides: readonly Ride[];
  /**
   * The card's colour what is lit wears: the circles ringed in it, End's
   * label in it. Null, the list's selected blue, worn the same way.
   */
  livery?: Livery | null;
  onPick?: (hotspotId: string) => void;
  /** A direction's trip to open, from the one ride a tail names. */
  onTrip?: (directionId: string) => void;
}) {
  // A train's ends are stations: each named with its sign code, GL02, as
  // the owner's CodeSign draws it (4073:7215, 2026-10-13); null for a
  // jeepney's, the ferry's, and a station the table does not know.
  const codeAt = (rideId: string | null, name: string): string | null => {
    const line = rides.find((r) => r.id === rideId)?.routeCode;
    return isRailLine(line) ? stationCode(line, name) : null;
  };
  return (
    <>
      {rideEnds(rides).map(
        ({ end, name, named, at, hotspotId, rides: here, of, paled, isMarked, mark }) => {
          const trip = onTrip && end === 'to' && here.length === 1 ? here[0] : null;
          const handlePlacePick = onPick && hotspotId ? () => onPick(hotspotId) : undefined;
          const handlePick = trip ? () => onTrip?.(trip) : handlePlacePick;
          return (
            <EndTitle
              // The ride's own end: two rides can end at one point under one name (a route's two ways round).
              key={`${of ?? name}:${end}@${at.join(',')}`}
              map={map}
              at={at}
              name={name}
              named={named}
              head={end === 'from'}
              // An end the ride picked on its trip doesn't reach, or a trip whose start stands alone: the S or E is on a pick's pin.
              marked={isMarked}
              mark={mark}
              livery={livery}
              codeSign={codeAt(of, name)}
              paled={paled}
              opens={trip ? 'trip' : 'place'}
              onPick={handlePick}
            />
          );
        },
      )}
    </>
  );
}

/** The circle across: TimelineDot at rest (timeline-dot.tsx), its centre on the point. */
const DOT_PX = 24;

/** What a pill's button says before the name: which end, as its icon shows it. */
const SPOKEN = {
  head: 'Start, ',
  tail: 'End, ',
  default: '',
} satisfies Record<RouteLineEndingsLabelVariant, string>;

/** What a pill's button says a tap opens. */
const OPENS = {
  trip: 'the trip there',
  place: 'the routes there',
} satisfies Record<'trip' | 'place', string>;

/** The selected blue's ring, Map/RouteLine/surface-selected, with no card's colour on. */
const LIT_RAIL = 'bg-map-route-line-surface-selected';

function EndTitle({
  map,
  at,
  name,
  named,
  head,
  marked,
  mark,
  livery,
  codeSign,
  paled,
  opens,
  onPick,
}: {
  map: MapLibreMap;
  at: LngLat;
  name: string;
  /** The one of its place that carries the name: a pill over the circle. */
  named: boolean;
  /** Where the ride starts (Head Route), or where it goes (Tail Route). */
  head: boolean;
  /** Start's S or End's E before the name: a Head or a Tail Route; else Default. */
  marked: boolean;
  /** Which it wears when marked: the S, or the E (rideEnds' `mark`). */
  mark: 'start' | 'end';
  livery: Livery | null;
  /** A train station's sign code, before its name (RouteLineEndingsLabel's CodeSign). */
  codeSign: string | null;
  /** Along the rest past a picked hintuan: the circle ringed in the card's pale. */
  paled: boolean;
  /** What a tap opens: the ride's trip, or the place's card. */
  opens: 'trip' | 'place';
  onPick?: () => void;
}) {
  const el = useMarkerElement(named ? 'end-title' : 'end-circle', 'end-title');
  // The circle is the marker's foot: its bottom half a radius below the
  // point, so the centre sits on it, the pill above.
  useMapMarker(map, el, at, { anchor: 'bottom', offset: [0, DOT_PX / 2], onTap: onPick });
  // Said on the marker for the suites: which end, of which name, where, and
  // what it wears. The name can pass to another ride's end (rideEnds names
  // the first to reach a place), so the test id follows.
  const opensWhat = onPick ? opens : '';
  useEffect(() => {
    el.setAttribute('data-testid', named ? 'end-title' : 'end-circle');
    el.setAttribute('data-name', name);
    el.setAttribute('data-end', head ? 'head' : 'tail');
    el.setAttribute('data-opens', opensWhat);
    el.setAttribute('data-at', `${at[0]},${at[1]}`);
    el.toggleAttribute('data-paled', paled);
  }, [el, named, name, head, opensWhat, at, paled]);
  const rail = livery ? (paled ? CARD_SURFACE_PALE[livery] : CARD_SURFACE[livery]) : LIT_RAIL;
  const markedAs = mark === 'start' ? 'head' : 'tail';
  const variant: RouteLineEndingsLabelVariant = marked ? markedAs : 'default';
  const Pill = onPick ? 'button' : 'div';
  return createPortal(
    <>
      {named && (
        <Pill
          {...(onPick
            ? {
                type: 'button' as const,
                // The code is only on the map: the button says it too.
                'aria-label': `${SPOKEN[variant]}${codeSign && variant !== 'default' ? `${codeSign} ` : ''}${name}: ${OPENS[opens]}`,
              }
            : {})}
          className="flex max-w-64 flex-col items-center"
        >
          <RouteLineEndingsLabel
            variant={variant}
            name={name}
            livery={livery}
            codeSign={codeSign}
          />
        </Pill>
      )}
      {/*
        The circle at the point, the pill's pointer at its ring: 13 below the
        pill — the pointer's 11 past the pill's edge (RouteLineEndingsLabel)
        and the 2 between its tip and the ring (Figma 3847:11777). Decoration:
        the pill names the end, and a bare circle has nothing to say.
      */}
      <span
        aria-hidden
        data-part="circle"
        className={'end-title-circle flex justify-center' + (named ? ' mt-3.25' : '')}
      >
        <TimelineDot rail={rail} isTucked={false} />
      </span>
    </>,
    el,
  );
}
