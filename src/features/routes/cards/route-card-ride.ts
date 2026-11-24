import type { RoadLivery } from '../model/liveries';
import type { Bound } from '../model/rail-codes';
import type { RailwayVehicle, RoadVehicle } from '../model/vehicles';

/** What a card's routes ride, which sets its colours and badges: a road mode's or a train line's. */
export type RouteCardRide =
  | {
      kind: 'road';
      livery: RoadLivery;
      /** The mode its badge names; null for a ride Figma draws no badge for (P2P, tricycle). */
      vehicle: RoadVehicle | null;
    }
  | {
      kind: 'rail';
      railway: RailwayVehicle;
      /** Which way the line's trains run; null on the ferry, or when it is not known. */
      bound: Bound | null;
      /** The origin's station code, `PL01`; null on the ferry, or a station the line's table does not know. */
      originCode: string | null;
    };

export interface RouteCardEndPoint {
  /** Which direction the row opens. */
  id: string;
  /** Figma's Destination: the place this direction goes to. */
  destination: string;
  /** Its route's via, under the place; null with none. */
  via: string | null;
  /** The station's code, `PL27`, at the row's end; null on a road card, the ferry, or an unknown station. */
  stationCode: string | null;
}
