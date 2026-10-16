import { Fragment, useRef, useState, type ReactNode } from 'react';

import { Button } from '@/design-system/primitives/button';
import { ChevronDownIcon, CloseIcon, EndIcon, StartIcon } from '@/shared/ui/route-icons';

import {
  BLOB_PLACE,
  BUTTON_FILL,
  CARD_BLOB,
  CARD_SHADOW,
  CARD_SURFACE,
  CARD_TEXT,
  ROW_PRESSED,
  TIMELINE_PILL,
  TIMELINE_SURFACE,
} from './livery-card';
import { RouteTripLineDetailPill } from './route-trip-line-detail-pill';
import { timelineFolds, type FoldPart } from './timeline-folds';
import {
  TimelineStick,
  type TimelineStickConnection,
  type TimelineStickVariant,
} from './timeline-stick';
import type { Livery } from '../model/liveries';
import { rideRows } from '../model/ride';

export interface TimelineRouteDetailProps {
  livery: Livery;
  /** Figma's Route on TimelineTop: the place the trip leaves from. */
  routeOrigin: string;
  /** Figma's TimelineHintuan rows: every hintuan on the way, in the order the jeep reaches them. */
  hintuans: readonly { id: string; label: string }[];
  /** The hintuan picked, by its row's id — Figma's Timeline State=Selected — or null: where the ride ends (E). */
  picked: string | null;
  /**
   * The hintuan made the ride's start (S) by Set as start, by its row's id,
   * or null: the ride leaves from the origin (the owner's TimelineRouteDetail,
   * 2026-10-15, Figma 4137:9886).
   */
  start?: string | null;
  /** On a train, the start station's code, for its pill (Variant3, and Variant4 beside the end's). */
  startCode?: string | null;
  /** Set as start, under the picked row while no start is picked. Without it, no button. */
  onSetStart?: () => void;
  /** × Remove as start, under the start's row. Without it, no button. */
  onRemoveStart?: () => void;
  /** A hintuan's row was tapped: pick it, or, picked, let it go. */
  onPick: (id: string) => void;
  /**
   * The pesos of the ride between the picks, for the pills on the end's row
   * and the start's (Variant4 draws both): the fare the tile under the
   * card shows, Regular or Discounted (the owner, 2026-09-30: "why it shows
   * calculated fare instead of its real value?" — the pill said "Calculated
   * Fare" for the day before). Omitted when unpriced, and no pill.
   */
  pickedPesos?: string;
  /**
   * On a train, the picked station's code, YL06, before the pesos in its
   * pill (the owner's answer of 2026-10-13 to the "YL06" his train frames
   * draw there, code first): two halves since 2026-10-15,
   * RouteTripLineDetailPill's Two. Null for a jeepney's hintuan,
   * the ferry's, and a station the table does not know: the pesos alone.
   */
  pickedCode?: string | null;
  /** The origin's row (`from`) or the destination's (`to`) was tapped: the whole ride again, and that end shown. */
  onEnd: (end: 'from' | 'to') => void;
  /**
   * The origin (`from`) or the destination (`to`), picked from its row: its
   * dot the Selected one, as a picked hintuan's; or null. One pick at a
   * time: the caller keeps this and `picked` apart (useRideTo does), since
   * both at once would draw two picked dots.
   */
  endPicked: 'from' | 'to' | null;
  /** Figma's Route on TimelineBottomEndRoute: the place the trip goes to. */
  routeDirection: string;
  /**
   * A train's trip: its fold reads "N more stations" (the owner's ask of
   * 2026-10-15, Figma's fold reading "stations" since; "stops" before, a word
   * the glossary keeps off hintuans). A jeep's, and the ferry's, read "N more
   * hintuans".
   */
  isTrain?: boolean;
  /**
   * Above the first row, on the card's colour: a train's RouteTripDetailHeader,
   * its line and bound (the owner's TimelineRouteDetailCard, 3778:3183, 2026-10-16).
   * Jeeps and the ferry have none.
   */
  header?: ReactNode;
}

/**
 * A trip's card, TimelineRouteDetailCard's (split from it, 2026-09-29): in the
 * trip's livery, its route's (liveries.ts), a rail from the origin
 * (TimelineTop) down to the place it goes to (TimelineBottomEndRoute).
 *
 * The hintuans between fold into one row, "10 more hintuans" (with an s
 * since this set); opened, every one of them shows alike — a
 * place other routes end at, SM Fairview on the way to Novaliches, is a
 * hintuan like the rest (his redrawing of the 28th's big mid-route row) —
 * and "View less" folds them again. It opens folded. A lone hintuan is shown
 * as it is: a row saying "1 more hintuan" would take its place only to hide
 * it (Claude's call, 2026-09-29, the owner's "go" standing on it).
 *
 * The fold moves on the Motion tokens (the owner's "try it", 2026-09-29: no
 * frames to animate it in first): the rows open over gentle, arriving
 * (ease-enter), and fold over base, leaving (ease-exit), each drawn from the
 * top as its height grows; the chevron turns over quick (ease-move). Folded,
 * the rows stay, invisible, so they can close in view — their insides drawn
 * only once the fold has been opened (2026-10-04) — and nothing moves for a
 * phone set to reduce motion. Height is layout, which the Motion note keeps
 * to opacity and transform: a fold is its one exception, since only the
 * height can push the destination down without measuring (the owner's
 * call, 2026-09-29).
 *
 * The rows are the owner's Timeline set (3716:1894) — TimelineStick for the
 * rail, TimelineDot for the hotspots — drawn in red there; each livery takes
 * its own Card/<livery>/Timeline/surface.
 * The rail runs only along the ride (the owner, 2026-10-15): end to end
 * with nothing picked; to a picked hintuan, where it stops (TimelineStick
 * MiddleBottom), the rows after it their dots alone (Disconnected), as the
 * map leaves pale everything outside the ride.
 *
 * A hintuan's row picks it (his Timeline State=Selected, 3769:2847,
 * 2026-09-29): its dot turns to a white ring round a centre in the card's
 * rail colour (green until 2026-09-30; TimelineDot), its name ExtraBold,
 * and a pill beside it holds the pesos from where the trip leaves to there,
 * the same the fare tile under the card shows, Regular or Discounted as it is
 * turned (it said "Calculated Fare" for part of 2026-09-30),
 * while a circle like its dot pops up on the map where it is, the route
 * left whole (his ask of 2026-09-30, "now I don't want to cut the route";
 * until then the map drew the ride dark only that far). Tapping it again
 * lets it go, the fare tile the whole ride's again; one at a time. A picked
 * row is in the ride, so it never folds away (it could, until 2026-10-15,
 * and stayed picked: the default he kept). The origin's and the
 * destination's rows are buttons too: a tap on either lets a hintuan go,
 * the ride whole again, and the map glides to that end, so a rider can look
 * along the route from end to end (his ask, 2026-09-29). Either end is
 * picked by its tap, its dot the Selected one, and let go by a second (his
 * "green circle too" for the destination and "it should have!" for the
 * origin, the same day); its name and the pesos stay as they are, the whole ride's being
 * the tile's.
 */
export function TimelineRouteDetail({
  livery,
  routeOrigin,
  hintuans,
  picked,
  onPick,
  start = null,
  startCode = null,
  onSetStart,
  onRemoveStart,
  pickedPesos,
  pickedCode = null,
  onEnd,
  endPicked,
  routeDirection,
  isTrain = false,
  header,
}: TimelineRouteDetailProps) {
  const [open, setOpen] = useState(false);
  // Once a start or an end is picked, the rows outside the ride fold apart,
  // before it and after it, each its own fold (timelineFolds). Nothing folds
  // under the finger: a ride picked from the open list leaves both open, and
  // a ride let go opens the list whole, the row just used among the rest
  // (Claude's call, 2026-10-15; whether it should fold back as it was is the
  // owner's to say).
  const hasRide = start !== null || picked !== null;
  const [hadRide, setHadRide] = useState(hasRide);
  const [openParts, setOpenParts] = useState({ before: false, after: false });
  if (hadRide !== hasRide) {
    setHadRide(hasRide);
    if (hasRide) setOpenParts({ before: open, after: open });
    else setOpen(true);
  }
  const isOpen = (part: FoldPart) => (part === 'all' ? open : openParts[part]);
  const toggle = (part: FoldPart) => {
    if (part === 'all') setOpen((o) => !o);
    else setOpenParts((p) => ({ ...p, [part]: !p[part] }));
    // The first tap opens it (it starts folded): from then on, drawn.
    setEverOpened(true);
  };
  // Whether the fold has ever been opened on this card: until then its rows
  // are their bare <li>s, the hidden insides left out (the cheap-phone
  // plan, step 11, 2026-10-04). A trip with 10 to 25 hintuans drew all of
  // them, invisible, as it opened, for a fold most riders never open.
  // Opened once, they stay drawn as long as the card is up, so they close
  // in view and open again as they always did. Set with `open` itself, in
  // the same render, so the first opening moves as every other.
  const [everOpened, setEverOpened] = useState(false);
  const folds = timelineFolds(hintuans, start, picked);
  const foldOf = new Map(folds.flatMap((f) => f.rowIds.map((id) => [id, f] as const)));
  const isShown = (id: string) => {
    const fold = foldOf.get(id);
    return !fold || isOpen(fold.part);
  };
  const rail = TIMELINE_SURFACE[livery];
  // The rail runs only along the ride (the owner, 2026-10-15): from its
  // first row to its last, whichever of the start and the end is above (an
  // end picked above the start, Variant5, is ridden the other way round).
  // The origin is -1, the destination the row count (rideRows). No pick, it
  // runs end to end.
  const { first, last } = rideRows(hintuans, start, picked) ?? {
    first: -1,
    last: hintuans.length,
  };
  const isOnRide = (i: number) => i >= first && i <= last;
  const pieceAt = (i: number): TimelineStickVariant => {
    if (i === first) return 'middleTop';
    if (i === last) return 'middleBottom';
    return 'middle';
  };
  // Every row's Pressed: the rail's colour, while the finger is down.
  const pressed = ROW_PRESSED[livery];

  return (
    <div
      data-testid="trip"
      data-livery={livery}
      className={
        'relative isolate flex w-full flex-col overflow-clip rounded-2xl border-y-[0.6px] font-sn-pro ' +
        CARD_SURFACE[livery] +
        ' ' +
        CARD_TEXT[livery]
      }
    >
      <img
        src={CARD_BLOB[livery].src}
        alt=""
        aria-hidden
        className={BLOB_PLACE + ' ' + CARD_BLOB[livery].className}
      />
      {header}
      {/* The fold row keeps its place among the children whether open or not,
          so a keyboard's focus stays on it while the hintuans come and go. */}
      <ol className="flex w-full flex-col">
        <TimelineTop
          livery={livery}
          rail={rail}
          pressed={pressed}
          routeOrigin={routeOrigin}
          isStart={start === null}
          connection={first === -1 ? 'connected' : 'disconnected'}
          selected={endPicked === 'from'}
          onTap={() => onEnd('from')}
        />
        {hintuans.map((h, i) => {
          const isStart = h.id === start;
          const isEnd = h.id === picked;
          const fold = foldOf.get(h.id);
          const shown = isShown(h.id);
          const { mark, code, action } = rowRole({
            isStart,
            isEnd,
            hasStart: start !== null,
            startCode,
            pickedCode,
            onSetStart,
            onRemoveStart,
          });
          return (
            <Fragment key={i + ':' + h.id}>
              <TimelineHintuan
                id={h.id}
                rail={rail}
                pressed={pressed}
                label={h.label}
                shown={shown}
                drawn={shown || everOpened}
                selected={isStart || isEnd}
                mark={mark}
                // The ride's pesos on its end and its start alike, as Variant4 draws them (the owner's yes, 2026-10-16).
                pesos={isEnd || isStart ? pickedPesos : undefined}
                code={code}
                livery={livery}
                connection={isOnRide(i) ? 'connected' : 'disconnected'}
                piece={pieceAt(i)}
                action={action}
                onPick={onPick}
              />
              {fold && fold.rowIds[fold.rowIds.length - 1] === h.id && (
                <TimelineDisclosure
                  part={fold.part}
                  rail={rail}
                  pressed={pressed}
                  open={isOpen(fold.part)}
                  count={fold.rowIds.length}
                  isTrain={isTrain}
                  // The rows outside the ride fold with no rail; with nothing picked, the rail runs through.
                  connection={fold.part === 'all' ? 'connected' : 'disconnected'}
                  onToggle={() => toggle(fold.part)}
                />
              )}
            </Fragment>
          );
        })}
        <TimelineBottomEndRoute
          livery={livery}
          rail={rail}
          pressed={pressed}
          routeDirection={routeDirection}
          isEnd={picked === null}
          connection={last === hintuans.length ? 'connected' : 'disconnected'}
          selected={endPicked === 'to'}
          onTap={() => onEnd('to')}
        />
      </ol>
      {/* The rows' names are set in SN Pro Medium, a face nothing else on a
          card may use (no "Other routes", no signboards: 8 of the 20 drawn
          directions on 2026-10-04). Drawn hidden, the folded rows asked for
          it as the card opened; undrawn, they would ask only as they open,
          and show their names in a stand-in font until it came
          (font-display: swap). One hidden name asks for it as they did. */}
      {!everOpened && folds.some((f) => !isOpen(f.part)) && (
        <span aria-hidden className="pointer-events-none invisible absolute font-medium">
          {hintuans[0]?.label}
        </span>
      )}
      <span
        aria-hidden
        className={'pointer-events-none absolute inset-0 rounded-[inherit] ' + CARD_SHADOW[livery]}
      />
    </div>
  );
}

interface TimelineDotProps {
  /** The rail's colour classes: the ring, and the Selected one's centre. */
  rail: string;
  selected?: boolean;
  /** 2px into the rail after it, as the card lays it; false where there is no rail (the map). */
  isTucked?: boolean;
}

/**
 * Figma's TimelineDot: Content/inverse ringed in the rail's colour. It sits
 * 2px into the rail after it, as the TimelineStick's -2px gap lays them.
 * Selected, the white grows and the ring thins to 2px round it, with a 12px
 * centre in the rail's colour again — the card's own, where it was
 * Content/success green until the owner's redrawing of 2026-09-30
 * (3778:3183: "the selected part is no longer green", the pick "based on
 * the surface"): 24 across either way, so nothing moves. The map's
 * hintuans and ride ends wear it too (HintuanLabel, EndTitles), untucked:
 * with no rail there, `isTucked` false keeps its box its own 24.
 */
export function TimelineDot({ rail, selected = false, isTucked = true }: TimelineDotProps) {
  const tuck = isTucked ? '-mb-0.5 ' : '';
  return selected ? (
    <span className={tuck + 'flex shrink-0 rounded-full p-0.5 ' + rail}>
      <span className="grid size-5 place-items-center rounded-full bg-content-inverse">
        <span className={'size-3 rounded-full ' + rail} />
      </span>
    </span>
  ) : (
    <span className={tuck + 'flex shrink-0 rounded-full p-1.5 ' + rail}>
      <span className="size-3 rounded-full bg-content-inverse" />
    </span>
  );
}

/**
 * Figma's TimelineTop: the dot the rail leaves from, and the origin in SN Pro
 * ExtraBold 20/28 (the owner's TimelineRouteDetailCard of 2026-10-13, 3778:3183;
 * Black 24/32 until then); the whole row is its button. Picked, its dot is
 * TimelineDot's Selected one.
 */
function TimelineTop({
  livery,
  rail,
  pressed,
  routeOrigin,
  isStart,
  connection,
  selected,
  onTap,
}: {
  livery: Livery;
  rail: string;
  /** ROW_PRESSED's classes for the card's livery. */
  pressed: string;
  routeOrigin: string;
  /** Where the ride starts, Start's S before its name: no start picked further on. */
  isStart: boolean;
  /** Disconnected once a start picked further on leaves it outside the ride. */
  connection: TimelineStickConnection;
  selected: boolean;
  onTap: () => void;
}) {
  return (
    <li data-testid="trip-origin" data-state={selected ? 'selected' : 'rest'}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onTap}
        className={'flex w-full items-center px-4 pt-4 text-left ' + pressed}
      >
        <TimelineStick
          variant="top"
          connection={connection}
          rail={rail}
          dot={<TimelineDot rail={rail} selected={selected} />}
        />
        <span className="flex min-w-0 flex-1 items-start gap-1 pb-2 pl-2">
          {isStart && <RideMark mark="start" livery={livery} />}
          {/* At a sheet's Low, one line of it (sheetGesture's LOW_PX); from Middle up, all of it. */}
          <span
            className={
              'min-w-0 flex-1 text-xl/7 font-extrabold sheet-low:line-clamp-1' +
              (isStart ? '' : ' pl-1')
            }
          >
            {routeOrigin}
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * A hintuan row open, or folded away: its one grid row runs from nothing to
 * its height (1fr), and back. `visibility` flips at the end of the fold, so
 * the row stays in sight while it closes, then leaves the words and the
 * screen reader. Folded and never opened, the row is its <li> alone: with
 * nothing in it its 0fr row is as tall as with its clipped inside, nothing
 * (2026-10-04), and it keeps these classes, so the first opening runs the
 * same transition from the same 0fr.
 */
const ROW_SHOWN = 'visible grid-rows-[1fr] duration-gentle ease-enter';
const ROW_FOLDED = 'invisible grid-rows-[0fr] duration-base ease-exit';

/** A row's part in the ride: its S or E, the code for its pill, and the button under it. */
interface RowRole {
  mark: 'start' | 'end' | null;
  code: string | null;
  action: { label: string; isRemove: boolean; onTap: () => void } | null;
}

/**
 * What a hintuan's row wears for the picks (the owner's TimelineRouteDetail,
 * 2026-10-15): the start's row its S, its station's code and × Remove as
 * start under it; the end's its E and its code, and Set as start under it
 * while no start is picked (Choosing); any other row, nothing.
 */
function rowRole(row: {
  isStart: boolean;
  isEnd: boolean;
  hasStart: boolean;
  startCode: string | null;
  pickedCode: string | null;
  onSetStart?: () => void;
  onRemoveStart?: () => void;
}): RowRole {
  if (row.isStart) {
    return {
      mark: 'start',
      code: row.startCode,
      action: row.onRemoveStart
        ? { label: 'Remove as start', isRemove: true, onTap: row.onRemoveStart }
        : null,
    };
  }
  if (row.isEnd) {
    return {
      mark: 'end',
      code: row.pickedCode,
      action:
        !row.hasStart && row.onSetStart
          ? { label: 'Set as start', isRemove: false, onTap: row.onSetStart }
          : null,
    };
  }
  return { mark: null, code: null, action: null };
}

/**
 * Figma's TimelineHintuan: a hintuan on the way, its dot on the rail; the
 * whole row is its button. Selected (State=Selected), its name is ExtraBold
 * (Black until 2026-10-13) and
 * the pill of its pesos sits 8 after it, 16 in from the card's edge.
 */
function TimelineHintuan({
  id,
  rail,
  pressed,
  label,
  shown,
  drawn,
  selected,
  pesos,
  code,
  livery,
  connection,
  piece,
  mark,
  action,
  onPick,
}: {
  id: string;
  rail: string;
  /** ROW_PRESSED's classes for the card's livery. */
  pressed: string;
  label: string;
  shown: boolean;
  /** Whether its inside is drawn: shown, or folded after it has been opened (TimelineRouteDetail's everOpened). */
  drawn: boolean;
  selected: boolean;
  /** The ride's pesos to here, for the pill; picked and priced only. */
  pesos?: string;
  /** A train station's code, before the pesos in the pill (RouteTripLineDetailPill); null for any other hintuan. */
  code: string | null;
  livery: Livery;
  /** On the ride's rail, or outside it, its dot alone. */
  connection: TimelineStickConnection;
  /** Its piece of the rail: MiddleTop where the ride starts, MiddleBottom where it ends, Middle between. */
  piece: TimelineStickVariant;
  /** The ride's start (S) or end (E), before its name; null for any other row. */
  mark: 'start' | 'end' | null;
  /** The button under the row: Set as start under the end, × Remove as start under the start. */
  action: RowRole['action'];
  onPick: (id: string) => void;
}) {
  // × Remove as start takes its own button away: the keyboard's focus goes
  // to the row it was under, not to the page. Set as start keeps its place,
  // the button under the row turning to × Remove as start.
  const pickButton = useRef<HTMLButtonElement>(null);
  return (
    <li
      data-testid="trip-hintuan"
      data-hintuan={id}
      data-state={selected ? 'selected' : 'rest'}
      className={
        'grid transition-[grid-template-rows,visibility] motion-reduce:transition-none ' +
        (shown ? ROW_SHOWN : ROW_FOLDED)
      }
    >
      {/* Clipped, not squeezed: the row keeps its height inside, and shows from the top. */}
      {drawn && (
        <div className="min-h-0 overflow-hidden">
          <button
            type="button"
            ref={pickButton}
            data-testid="trip-hintuan-pick"
            aria-pressed={selected}
            onClick={() => onPick(id)}
            className={'flex w-full items-start px-4 text-left ' + pressed}
          >
            <TimelineStick
              variant={piece}
              connection={connection}
              rail={rail}
              dot={<TimelineDot rail={rail} selected={selected} />}
            />
            {mark && <RideMark mark={mark} livery={livery} isSmall />}
            <span
              className={
                'flex min-w-0 flex-1 items-center gap-2 py-2 ' + (mark ? 'pl-1.5' : 'pl-3')
              }
            >
              <span
                className={
                  'min-w-0 flex-1 text-base/6 ' + (selected ? 'font-extrabold' : 'font-medium')
                }
              >
                {label}
              </span>
              {/* After the name, so the name is still the row's first words; the circled letter is for the eye. */}
              {mark && <span className="sr-only">{mark === 'start' ? ', start' : ', end'}</span>}
              {pesos && <RouteTripLineDetailPill livery={livery} code={code} pesos={pesos} />}
            </span>
          </button>
          {/* Under the row, its own button (the owner's Choosing and Variant3,
              4137:9887 and 4148:12161): a sibling of the row's, never inside it.
              The rail runs on beside it where the ride does, past a start. */}
          {action && (
            <div className="flex px-4">
              <TimelineStick
                variant="disclosure"
                connection={
                  connection === 'connected' && piece !== 'middleBottom'
                    ? 'connected'
                    : 'disconnected'
                }
                rail={rail}
              />
              <span className="pb-2 pl-3">
                <Button
                  variant="primary"
                  size="small"
                  fill={BUTTON_FILL[livery]}
                  label={action.label}
                  firstIcon={action.isRemove ? <CloseIcon /> : undefined}
                  onClick={() => {
                    if (action.isRemove) pickButton.current?.focus();
                    action.onTap();
                  }}
                />
              </span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/** Figma's TimelineDisclosure: the hintuans folded into one row, or, opened, the row that folds them. */
function TimelineDisclosure({
  part,
  rail,
  pressed,
  open,
  count,
  isTrain,
  connection,
  onToggle,
}: {
  /** Which rows it folds: every hintuan, or those before or after a picked ride (timelineFolds). */
  part: FoldPart;
  rail: string;
  /** ROW_PRESSED's classes for the card's livery. */
  pressed: string;
  open: boolean;
  count: number;
  /** "N more stations" on a train, "N more hintuans" else. */
  isTrain: boolean;
  /** Disconnected once its rows are outside a picked ride. */
  connection: TimelineStickConnection;
  onToggle: () => void;
}) {
  const foldWord = isTrain ? 'stations' : 'hintuans';
  return (
    <li>
      <button
        type="button"
        data-testid="trip-fold"
        aria-expanded={open}
        data-part={part}
        onClick={onToggle}
        className={'flex w-full items-start px-4 text-left ' + pressed}
      >
        <TimelineStick variant="disclosure" connection={connection} rail={rail} />
        <span className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-3 text-sm/5 font-normal whitespace-nowrap">
          {/* One chevron, turned: Figma's chevron-down, and its chevron-up opened. */}
          <span
            aria-hidden
            className={
              'size-5 shrink-0 transition-transform duration-quick ease-move *:size-full motion-reduce:transition-none ' +
              (open ? 'rotate-180' : 'rotate-0')
            }
          >
            <ChevronDownIcon />
          </span>
          {open ? 'View less' : `${count} more ${foldWord}`}
        </span>
      </button>
    </li>
  );
}

/**
 * Figma's TimelineBottomEndRoute: the rail's last dot, and where the trip
 * goes, behind End's circled E (the owner's TimelineRouteDetailCard of 2026-10-13,
 * 3778:3183, as the map's end label has it; the list's arrow until then);
 * the whole row is its button. Picked, its dot is TimelineDot's Selected one.
 */
function TimelineBottomEndRoute({
  livery,
  rail,
  pressed,
  routeDirection,
  isEnd,
  connection,
  selected,
  onTap,
}: {
  livery: Livery;
  rail: string;
  /** ROW_PRESSED's classes for the card's livery. */
  pressed: string;
  routeDirection: string;
  /** Where the ride ends, End's E before its name: no hintuan picked as the end. */
  isEnd: boolean;
  /** Disconnected once a picked hintuan ends the ride before it. */
  connection: TimelineStickConnection;
  selected: boolean;
  onTap: () => void;
}) {
  return (
    <li data-testid="trip-destination" data-state={selected ? 'selected' : 'rest'}>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onTap}
        className={'flex w-full items-center px-4 pb-4 text-left ' + pressed}
      >
        <TimelineStick
          variant="bottom"
          connection={connection}
          rail={rail}
          dot={<TimelineDot rail={rail} selected={selected} />}
        />
        <span className={'flex min-w-0 flex-1 items-start gap-1 pt-3 ' + (isEnd ? 'pl-2' : 'pl-3')}>
          {isEnd && <RideMark mark="end" livery={livery} />}
          {/* Bold, Figma's text-xl/bold (the owner, 2026-09-30: "bold"). The
              Timeline set (3716:1894) draws it Medium, ExtraBold picked; the
              owner kept the trip frame's Bold on 2026-10-13. */}
          <span className="min-w-0 flex-1 text-xl/7 font-bold">{routeDirection}</span>
        </span>
      </button>
    </li>
  );
}

/**
 * Where the ride starts and ends, before a row's name, the owner's
 * RouteSigns (4148:12449): Start's circled S and End's circled E, each a
 * disc on a white ring, the letter in white (his "start has white background
 * and green icon color, E should have white background too", 2026-10-16:
 * on the card till then, the S's disc and the E's letter showed the card
 * through). The S's disc is green, as the map's Head Route wears it; the
 * E's the card's colour, the pill's (TIMELINE_PILL: a train's line's
 * Timeline/surface). They move with the picks (his TimelineRouteDetail,
 * 2026-10-15): the S from the origin to a start picked further on, the E
 * from the destination to a picked end. For the eye: a hintuan's row says
 * "start" or "end" after its name, and the ends' rows are where a ride
 * leaves and goes, as before. 24 across, as RouteSigns is, 12 after the
 * rail and 6 before the name: `isSmall`, on a hintuan's 16/24 line, 8
 * down as the name's padding is; beside the ends' 20/28, centred on it.
 */
function RideMark({
  mark,
  livery,
  isSmall = false,
}: {
  mark: 'start' | 'end';
  livery: Livery;
  isSmall?: boolean;
}) {
  return (
    <span
      aria-hidden
      data-part={mark}
      className={
        'flex shrink-0 rounded-full *:size-6 ' +
        (isSmall ? 'mt-2 ml-3 ' : 'my-0.5 mr-0.5 ml-1 ') +
        (mark === 'start' ? START_MARK : TIMELINE_PILL[livery])
      }
    >
      {mark === 'start' ? <StartIcon /> : <EndIcon />}
    </span>
  );
}

/** Start's S: a green disc (the hintuans' Head Route green) on Content/inverse. */
const START_MARK = 'bg-content-inverse text-map-hotspots-card-hintuan-surface';
