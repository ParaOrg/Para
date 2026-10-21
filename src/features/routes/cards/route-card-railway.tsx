import {
  BLOB_PLACE,
  CARD_BLOB,
  CARD_SHADOW,
  CARD_SHADOW_SELECTED,
  CARD_SURFACE,
  CARD_TEXT,
} from './livery-card';
import { RouteEndPointBar } from './route-end-point-bar';
import { VehicleIcon } from './vehicle-icon';
import { RAILWAY_LIVERY } from '../model/liveries';
import type { Bound } from '../model/rail-codes';
import type { RailwayVehicle } from '../model/vehicles';

interface RailwayEndPoint {
  /** Which direction the row opens. */
  id: string;
  /** Figma's routeDirection: the station this direction goes to. */
  routeDirection: string;
  /** The station's code, `PL01`, in the row's slot; null on the ferry, or a station the line's table does not know. */
  stationCode: string | null;
}

interface RouteCardRailwayProps {
  /** Figma's Property 1: the line, LRT 1, LRT 2, MRT 3, or the Ferry. It sets the card's colours. */
  railway: RailwayVehicle;
  /**
   * Which way the line's trains run; null on the ferry, or when it is not known. Figma draws no
   * bound on the card, so it is read out, not shown: the rows say where the trains go.
   */
  bound: Bound | null;
  /** Figma's State, as a RouteCard's. */
  state: 'rest' | 'selected';
  /** Figma's Route Origin: the station the card's directions leave from. */
  routeOrigin: string;
  /** One row per direction leaving it, in the order given. */
  endPoints: readonly RailwayEndPoint[];
  /** A tap on the card outside its rows: select it, or let it go. */
  onSelect: () => void;
  /** A row was tapped: open that direction. */
  onPick: (id: string) => void;
  /** What the suites call the card and its parts, as RouteCard's. */
  testId: 'chooser' | 'card';
}

/** The line's name as Figma's pill writes it. */
const PILL_LABEL = {
  'LRT-1': 'LRT 1',
  'LRT-2': 'LRT 2',
  'MRT-3': 'MRT 3',
  Ferry: 'Ferry',
} satisfies Record<RailwayVehicle, string>;

/**
 * The pills' fill and words, the line's and a station code's: the line's surface on white, and on
 * MRT-3's yellow its yellow on Content/primary. Figma writes the codes in #584a77 and #eec72a, bound
 * to no variable; they take the line's surface here, as the line's pill does.
 */
const PILL = {
  'LRT-1': 'bg-content-inverse text-map-rail-light-rail-way-one-surface',
  'LRT-2': 'bg-content-inverse text-map-rail-light-rail-way-two-surface',
  'MRT-3': 'bg-content-primary text-map-rail-metro-rail-way-three-surface',
  Ferry: 'bg-content-inverse text-map-ferry-surface',
} satisfies Record<RailwayVehicle, string>;

/**
 * A station and the train or ferry directions that leave it one way —
 * Figma's RouteCardRailway (4261:15199): one card per line and bound, in the
 * line's own colours. Over the station's name, its vehicle in a chip and the
 * line's pill beside it, both in the pill's colours; under it a row per
 * station it goes to (RouteEndPointBar), each with its station code's pill in
 * the row's slot, before the name. The ferry has no codes.
 *
 * It behaves as RouteCard does: a row opens its trip; a tap anywhere else
 * selects the card, or lets it go, State=Selected pressing it in under the
 * Selected shadow. The test ids are RouteCard's, so the suites find a
 * train's card as they find a jeep's.
 */
export function RouteCardRailway({
  railway,
  bound,
  state,
  routeOrigin,
  endPoints,
  onSelect,
  onPick,
  testId,
}: RouteCardRailwayProps) {
  const livery = RAILWAY_LIVERY[railway];
  const isSelected = state === 'selected';
  return (
    <div
      data-testid={`${testId}-origin`}
      data-livery={livery}
      data-state={state}
      className={
        'relative isolate flex w-full flex-col items-start gap-2 overflow-clip border-y-[0.6px] py-2 font-sn-pro ' +
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
      <div className="flex w-full items-center gap-2 px-4 pt-2">
        <span aria-hidden className={'shrink-0 rounded-full p-0.5 ' + PILL[railway]}>
          <span className="block size-7 *:size-full">
            <VehicleIcon vehicle={railway} />
          </span>
        </span>
        <p
          data-testid={`${testId}-pill`}
          className={
            'rounded-lg px-2 py-0.5 text-lg/7 font-semibold whitespace-nowrap ' + PILL[railway]
          }
        >
          {PILL_LABEL[railway]}
          {bound && <span className="sr-only">, {bound}</span>}
        </p>
      </div>
      <div className="flex w-full flex-col">
        <div className="flex w-full px-4">
          {/* The name is the card's own target, stretched over all of it; the
              rows are drawn over that, so they keep their own taps. */}
          <button
            type="button"
            data-testid={`${testId}-select`}
            aria-pressed={isSelected}
            onClick={onSelect}
            className="w-full text-left text-2xl/8 font-bold after:absolute after:inset-0 sheet-low:line-clamp-1"
          >
            {routeOrigin}
          </button>
        </div>
        <ul className="flex w-full flex-col">
          {endPoints.map((e, index) => (
            <li key={e.id}>
              <RouteEndPointBar
                routeDirection={e.routeDirection}
                on={livery}
                position={index === endPoints.length - 1 ? 'bottom' : 'top'}
                slot={
                  e.stationCode && (
                    <>
                      <span
                        className={
                          'shrink-0 rounded-full px-1.5 py-0.5 text-xs/4 font-medium ' +
                          PILL[railway]
                        }
                      >
                        {e.stationCode}
                      </span>
                      <span className="sr-only">, </span>
                    </>
                  )
                }
                data-testid={`${testId}-item`}
                data-direction={e.id}
                onClick={() => onPick(e.id)}
                className="relative"
              />
            </li>
          ))}
        </ul>
      </div>
      <span
        aria-hidden
        className={
          'pointer-events-none absolute inset-0 ' +
          (isSelected ? CARD_SHADOW_SELECTED[livery] : CARD_SHADOW[livery])
        }
      />
    </div>
  );
}
