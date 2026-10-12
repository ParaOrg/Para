import type { MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import type { LngLat } from '@/shared/utils/geo';

import { rideEnds, type Ride } from './direction-arrows';
import type { LineLook } from './livery-line';
import { SelectedHintuanRouteTitle } from './selected-hintuan-route-title';
import { useMapMarker, useMarkerElement } from './use-map-marker';
import { CARD_SURFACE, CARD_SURFACE_PALE } from '../cards/livery-card';
import { TimelineDot } from '../cards/trip-timeline';
import type { Livery } from '../model/liveries';

import './end-titles.css';

/**
 * Each lit ride's ends: a circle at each, and over the named ones the
 * owner's SelectedHintuanRouteTitle, End&TailRoute (Figma 3848:12135,
 * 2026-09-30), a pill over the circle, its pointer at the circle, in place
 * of the plain name the map wrote beside it.
 *
 * The circle is the hintuan's own — the card timeline's TimelineDot, as the
 * dots along the line (StationLabels) and the picked hintuan's circle
 * (HintuanPin) are — ringed in what the line wears: the card's colour
 * (`livery`), the selected blue with none, and the card's pale at the far
 * end of a ride past a picked hintuan, along the rest drawn in it (Ride.rest,
 * useRideRest), as the dots along the rest are. The owner's ask of
 * 2026-10-12: "make the end and last hintuan circle similar to the hintuan
 * circle so it's consistent, and reusable"; until then the ends were a
 * circle layer of the map's (direction-arrows.ts), a 2 px ring half the
 * line wide, like nothing else drawn on it, with its own GL program to warm
 * (warm-programs.ts). 24 across at every zoom, since the pills show at
 * every zoom.
 *
 * Unmarked, the pill is its Default: it wears what is lit, the line's colour,
 * and the chevrons' white for its words, as a card's are. Marked, it is a
 * Head Route or a Tail Route (the owner's redrawing of 2026-10-12: "start and
 * end will follow this color, blue is the end, green is the start"): Start's
 * green with its circled S on where a ride starts, End's blue with its
 * circled E on where it goes, white words on both, and the pointer the same.
 *
 * Head Route and Tail Route (2026-10-01) read as the RouteCard does: where
 * a ride starts, the top of its timeline, is the card's title; where it
 * goes is one of the card's rows. While what is lit wears a card's colour
 * (`livery`) — an open trip, or a picked card's rides, Tala's to Novaliches
 * and to SM Fairview — each name says which end it is (2026-10-02): the
 * words Start and End stood over the names until the icons took their
 * place, and the Tail Route's circled arrow, the rows' own, went with them
 * (his redrawing of 2026-10-12). A ride a picked hintuan stops short
 * (`flow`) ends there, End's E before the hintuan's name (HintuanPin), so
 * its own tail keeps its name without one (the owner's ask, 2026-10-02). A
 * list's routes lit in the selected blue keep their plain names: there are
 * too many (the owner's ask, the same day). A place two rides share is
 * named by the first to reach it (`rideEnds`), so a trip's change of ride
 * is the earlier ride's tail, as it sits under the start on the timeline;
 * the other ride's end there keeps its circle, bare.
 *
 * DOM markers, like the picked hintuan's circle (HintuanPin), whose pill is
 * the same SelectedHintuanRouteTitle, 256 across at most, as the pin's:
 * Figma's own sample, North Caloocan City Hall, whole at 16/24 after the
 * icon (224 held the 14px names until the icons). Each place is named once
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
 * ride's trip instead (the owner's ask, 2026-10-01): its RouteTripDetail,
 * its line lit, as the card's row of the same arrow does. Where two rides
 * go, the place's own card lists both, so the tap opens that. How a
 * focused or pressed pill looks is the owner's to design; until then it is
 * the browser's own focus ring.
 */
export function EndTitles({
  map,
  rides,
  look,
  livery = null,
  onPick,
  onTrip,
}: {
  map: MapLibreMap;
  rides: readonly Ride[];
  look: LineLook;
  /**
   * The card's colour what is lit wears: the circles ringed in it, Start's S
   * and End's E before the names. Null, the list's selected blue: the
   * circles ringed in it, the names plain.
   */
  livery?: Livery | null;
  onPick?: (hotspotId: string) => void;
  /** A direction's trip to open, from the one ride a tail names. */
  onTrip?: (directionId: string) => void;
}) {
  // Rides that end short of their tail, at a picked hintuan.
  const short = new Set(rides.filter((r) => r.flow && r.id).map((r) => r.id));
  return (
    <>
      {rideEnds(rides).map(({ end, name, named, at, hotspotId, rides: here, of, paled }) => {
        const trip = onTrip && end === 'to' && here.length === 1 ? here[0] : null;
        return (
          <EndTitle
            // The ride's own end: two rides can end at one point under one name (a route's two ways round).
            key={`${of ?? name}:${end}@${at.join(',')}`}
            map={map}
            at={at}
            name={name}
            named={named}
            head={end === 'from'}
            marked={!!livery && !(end === 'to' && here.some((id) => short.has(id)))}
            livery={livery}
            paled={paled}
            look={look}
            opens={trip ? 'trip' : 'place'}
            onPick={
              trip
                ? () => onTrip?.(trip)
                : onPick && hotspotId
                  ? () => onPick(hotspotId)
                  : undefined
            }
          />
        );
      })}
    </>
  );
}

/** The circle across: TimelineDot at rest (trip-timeline.tsx), its centre on the point. */
const DOT_PX = 24;

/** The selected blue's ring, Map/RouteLine/surface-selected, with no card's colour on. */
const LIT_RAIL = 'bg-map-route-line-surface-selected';

function EndTitle({
  map,
  at,
  name,
  named,
  head,
  marked,
  livery,
  paled,
  look,
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
  livery: Livery | null;
  /** Along the rest past a picked hintuan: the circle ringed in the card's pale. */
  paled: boolean;
  look: LineLook;
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
    el.dataset.testid = named ? 'end-title' : 'end-circle';
    el.dataset.name = name;
    el.dataset.end = head ? 'head' : 'tail';
    el.dataset.opens = opensWhat;
    el.dataset.at = `${at[0]},${at[1]}`;
    el.toggleAttribute('data-paled', paled);
  }, [el, named, name, head, opensWhat, at, paled]);
  const rail = livery ? (paled ? CARD_SURFACE_PALE[livery] : CARD_SURFACE[livery]) : LIT_RAIL;
  const Pill = onPick ? 'button' : 'div';
  return createPortal(
    <>
      {named && (
        <Pill
          {...(onPick
            ? {
                type: 'button' as const,
                'aria-label': `${marked ? (head ? 'Start, ' : 'End, ') : ''}${name}: ${opens === 'trip' ? 'the trip there' : 'the routes there'}`,
              }
            : {})}
          className="flex max-w-64 flex-col items-center"
        >
          {marked ? (
            <SelectedHintuanRouteTitle variant={head ? 'head' : 'tail'} name={name} pointer />
          ) : (
            <SelectedHintuanRouteTitle variant="default" name={name} look={look} pointer />
          )}
        </Pill>
      )}
      {/*
        The circle at the point, the pill's pointer at its ring: 13.5 below the
        pill — the pointer's 11.5 past the pill's edge (SelectedHintuanRouteTitle)
        and the 2 between its tip and the ring (Figma 3847:11777). Decoration:
        the pill names the end, and a bare circle has nothing to say.
      */}
      <span
        aria-hidden
        data-part="circle"
        className={'end-title-circle flex justify-center' + (named ? ' mt-[13.5px]' : '')}
      >
        <TimelineDot rail={rail} />
      </span>
    </>,
    el,
  );
}
