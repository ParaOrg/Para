import { Button } from '@/design-system/primitives/button';
import { IconButton } from '@/design-system/primitives/icon-button';
import { ChevronLeftIcon, CloseIcon, RoutesIcon } from '@/shared/ui/route-icons';

type Props = {
  /** SWITCH: the other way round — every route in the list, or the trip's own. */
  onSwitch: () => void;
  /** False when the other way round has nothing drawn to show; SWITCH then rests disabled. */
  switchable: boolean;
  /**
   * Whether the way back is what is showing, for the suites (`data-back`).
   * SWITCH is no toggle since its word names the way it leads to: pressed, a
   * button called Papunta would say Papunta is on while Pabalik shows.
   */
  back: boolean;
  /**
   * The word on SWITCH, switchWord's for the directions on show: the way a
   * tap leads to, Pabalik over Papunta and back again, or a train's other
   * bound. Its name is the word on it, so "tap Pabalik" finds it by voice
   * too. Null: no SWITCH at all, for a loop has no way back to turn to.
   */
  way: string | null;
  onClose: () => void;
} & (
  | {
      /**
       * Figma's Default, over the route list: Routes and its count, `2
       * Routes`, `1 Route` — or, with no route under the tap, its hotspots',
       * `2 Hotspots`.
       */
      routeCount: string;
      onBackToList?: never;
    }
  | {
      /**
       * Figma's Variant2, over a trip: ‹ back to what the trip was picked
       * from — the list, a hotspot's card — or, opened on its
       * own, to its route with those sharing an end; null when there is none
       * (no other route sharing an end has a direction drawn the trip's way
       * round) — then nothing stands in its place.
       */
      onBackToList: (() => void) | null;
      routeCount?: never;
    }
);

/**
 * The top of the route list and of a trip — Figma's RouteCardHeader
 * (3742:1049): on the left Routes and the count in SN Pro Bold (Default) or ‹
 * (Variant2, the trip's); on the right SWITCH (Button, Special) and ✕
 * (IconButton), on Background/surface. SWITCH answers to `chooser-flip` over
 * the list and `card-switch` over a trip, as the suites have known each since
 * before the redesign.
 *
 * On a phone it sits flush under the dock's HandleNotch (Figma's
 * BottomSheetConfiguration, 3815:5637); from `@float:` the notch is gone and
 * 12 stand above it.
 *
 * The tooltips hang below their buttons: above, they would leave the card at
 * the top of the screen.
 */
export function RouteCardHeader({
  routeCount,
  onBackToList,
  onSwitch,
  switchable,
  back,
  way,
  onClose,
}: Props) {
  // 12 below, over the list and over a trip alike: the card follows it
  // straight away (Figma 3742:1049 and 3778:3183).
  return (
    <div className="flex w-full items-center gap-2 bg-surface px-3 pt-0 pb-3 @float:pt-3">
      {routeCount !== undefined ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 text-content-primary">
          {/* Figma's Routes at 28 (4192:12133). */}
          <span aria-hidden className="size-7 shrink-0 *:size-full">
            <RoutesIcon />
          </span>
          <p className="min-w-0 flex-1 truncate font-sn-pro text-xl/7 font-bold">{routeCount}</p>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center">
          {onBackToList && (
            <IconButton
              icon={<ChevronLeftIcon />}
              label="Back"
              tooltip="top"
              onClick={onBackToList}
            />
          )}
        </div>
      )}
      <div className="flex shrink-0 items-center gap-3">
        {way !== null && (
          <Button
            variant="special"
            label={way}
            data-testid={routeCount !== undefined ? 'chooser-flip' : 'card-switch'}
            data-back={back}
            disabled={!switchable}
            onClick={onSwitch}
          />
        )}
        <IconButton icon={<CloseIcon />} label="Close" tooltip="top" onClick={onClose} />
      </div>
    </div>
  );
}
