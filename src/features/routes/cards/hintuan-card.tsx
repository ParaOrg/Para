import { useState, type Ref } from 'react';

import { BottomSheet, type SheetHeight } from '@/shared/ui/bottom-sheet';

import { HintuanCardBox } from './hintuan-card-box';
import { HintuanCardCounter } from './hintuan-card-counter';
import { HintuanCardHeader } from './hintuan-card-header';
import { RouteCardStack, type PickedPlace } from './route-card-stack';
import { useTellShown } from './use-tell-shown';
import { drawnDepartures, switchWord } from '../model/departures';
import { hotspotLabel, type Hotspot } from '../model/hotspots';
import type { Livery } from '../model/liveries';
import { boxTheOtherWay, placeBoxes } from '../model/places';
import { isLoop } from '../model/routes';
import type { Direction } from '../model/routes';

interface Props {
  /** The box picked: the one tapped on the map, or a row since. Its row is Selected. */
  hotspot: Hotspot;
  /** Every hotspot, for the other boxes of its place. */
  hotspots: readonly Hotspot[];
  /** The directions that stop at a box, by its id. */
  linkedDirectionIds: (id: string) => readonly string[];
  directions: readonly Direction[];
  /** Called with the direction picked, and the colour its card wore: its trip wears the same. */
  onSelectDirection: (v: Direction, livery?: Livery) => void;
  /**
   * The routes stopping at the box as RouteCards, as the route list shows
   * them: the place whose card is Selected, what to do when one is picked or
   * let go, and where to say which directions they show, for the map to light.
   */
  routeCards: {
    selected: string | null;
    onSelect: (place: PickedPlace | null) => void;
    /** What the RouteCards show while the card is open; null once it closes. */
    onShown: (ids: readonly string[] | null) => void;
    /**
     * SWITCH pressed: the routes turn round, and `box`, when the other way
     * leaves from another box of the place, is the one to select. The camera
     * stays where the commuter tapped the hintuan — no zoom, no glide.
     */
    onSwitch?: (box: string | null) => void;
  };
  /** Another box of the place picked from its row: select it and go there. */
  onPickBox: (id: string) => void;
  /**
   * No row Selected: the Selected one tapped again lets it go, and the card
   * shows the routes through every box of the place until a row is picked —
   * the same one, or another.
   */
  deselected?: boolean;
  /** The Selected row tapped: let it go. */
  onDeselect?: () => void;
  onClose: () => void;
  /** ‹, back to the trip whose name on the map opened the card; none, and no ‹. */
  onBack?: (() => void) | null;
  /** Kept but not shown, while a trip picked from it is on top: ‹ comes back to it as it was left. */
  hidden?: boolean;
  /** Its height, shared with the trip opened from it (BottomSheet). */
  height?: SheetHeight;
  /** The dock the card sits in, for the map to glide a picked box clear of it. */
  dockRef?: Ref<HTMLDivElement>;
}

/**
 * A place and every box of it — Figma's HintuanCard (3854:12690), the public
 * map's card for a hotspot.
 *
 * Under the place's name, a HotspotSelectionBar per box: terminals first, in
 * sky, then the hintuans, in green, each in the order drawn, and boxes of one
 * name numbered (placeBoxes). The box tapped on the map is the Selected one,
 * pressed in; a tap on another row picks it, and the map goes there, the card
 * staying at its height (the caller's `onPickBox`). A tap on the Selected row
 * lets it go: no row Selected, and the routes below are the whole place's
 * until a row is picked again (`deselected`).
 *
 * Under the rows, the routes that stop at the Selected box — only there:
 * Lagro 1, on the way to SM Fairview, lists Tala → SM Fairview and →
 * Novaliches; Lagro 2, across the road, their way back. The
 * HintuanCardRouteCounter (3851:12206) sits across the join, with SWITCH: the
 * other way round, at this box when it is passed both ways, else at the
 * nearest box of the place that is — the selection moves there. With no box
 * passed the other way, SWITCH rests disabled; with no route at all, the
 * counter is left out.
 *
 * ⓘ rests disabled, the owner's call, until the hintuan's description card is
 * designed. TODO: open that description from ⓘ once its card is designed.
 */
export function HintuanCard({
  hotspot,
  hotspots,
  linkedDirectionIds,
  directions,
  onSelectDirection,
  routeCards,
  onPickBox,
  deselected = false,
  onDeselect,
  onClose,
  onBack,
  hidden,
  height,
  dockRef,
}: Props) {
  const label = hotspotLabel(hotspot);
  const rows = placeBoxes(
    hotspot,
    hotspots.some((s) => s.id === hotspot.id) ? hotspots : [hotspot, ...hotspots],
  );
  const byId = new Map(directions.map((v) => [v.id, v]));
  const linked = (id: string) =>
    linkedDirectionIds(id)
      .map((v) => byId.get(v))
      .filter((v): v is Direction => !!v);
  /** Whether a box is passed `back` — the way back — or the way there, by a drawn direction. */
  // A loop is passed both ways round, so it never decides which way a box is passed.
  const passes = (id: string, back: boolean) =>
    drawnDepartures(
      linked(id).filter((v) => !isLoop(v)),
      back,
    ).length > 0;

  // What the routes below are of: the Selected box, or with none, every box
  // of the place, each direction once.
  const routes = deselected
    ? [...new Map(rows.flatMap((r) => linked(r.box.id)).map((v) => [v.id, v])).values()]
    : linked(hotspot.id);

  // The way round asked for; routes passing one way only show that way.
  const [flipped, setFlipped] = useState(false);
  const twoEnded = routes.filter((v) => !isLoop(v));
  const there = drawnDepartures(twoEnded, false).length > 0;
  const backToo = drawnDepartures(twoEnded, true).length > 0;
  const back = there && backToo ? flipped : backToo;
  const showing = drawnDepartures(routes, back).flatMap((p) => p.directions.map((d) => d.v));
  const shown = showing.map((v) => v.id);

  // The other way round: here, when these routes run both ways; else the
  // nearest box of the place that is passed that way — none with no row
  // Selected, where the whole place already shows.
  const other = !back;
  const switchTo =
    there && backToo
      ? hotspot
      : deselected
        ? null
        : boxTheOtherWay(
            hotspot,
            rows.map((r) => r.box),
            (id) => passes(id, other),
          );

  const shownKey = shown.join('\n');
  useTellShown(routeCards.onShown, shownKey);

  // Figma's "2 routes passes here", its verb agreeing with the count. It
  // counts the head routes, a card each, not their tails.
  const heads = drawnDepartures(routes, back).length;
  const count = `${heads} ${heads === 1 ? 'route passes' : 'routes pass'} here`;

  return (
    <BottomSheet
      ref={dockRef}
      testId="card"
      label={label}
      onClose={onClose}
      hidden={hidden}
      height={height}
      header={<HintuanCardHeader label={label} onBack={onBack} onClose={onClose} />}
    >
      <ul>
        {rows.map(({ box, label: name }, i) => {
          const isSelected = !deselected && box.id === hotspot.id;
          return (
            <li key={box.id}>
              <HintuanCardBox
                box={box}
                name={name}
                isSelected={isSelected}
                hasCounter={i === rows.length - 1 && shown.length > 0}
                onToggle={() => {
                  if (!isSelected) onPickBox(box.id);
                  else onDeselect?.();
                }}
              />
            </li>
          );
        })}
      </ul>

      {shown.length > 0 && (
        // The first RouteCard makes room at its top for the counter: 36 over
        // its title's own 8 (Figma 3854:12526).
        <div className="relative [&>:first-child]:pt-9">
          <RouteCardStack
            routes={routes}
            back={back}
            selected={routeCards.selected}
            onSelect={routeCards.onSelect}
            onRoute={onSelectDirection}
            testId="card"
          />
          <HintuanCardCounter
            count={count}
            word={showing.every(isLoop) ? null : switchWord(back, showing)}
            isBack={back}
            canSwitch={!!switchTo}
            onFlip={() => {
              if (!switchTo) return;
              routeCards.onSelect(null);
              setFlipped(other);
              routeCards.onSwitch?.(switchTo.id !== hotspot.id ? switchTo.id : null);
            }}
          />
        </div>
      )}
    </BottomSheet>
  );
}
