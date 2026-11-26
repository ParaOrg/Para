import type { ReactNode } from 'react';

import type { Hotspot, HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import type { LngLat } from '@/shared/utils/geo';

import { CardActions } from './card-actions';
import { DraftSignboards } from './draft-signboards';
import { RouteExportPanel } from './route-export-panel';
import { RouteFacts } from './route-facts';

interface TripCardExtrasProps {
  /** The direction on the trip card. */
  direction: DirectionRow;
  /** Every listed direction: the export takes the open route's two. */
  directions: readonly DirectionRow[];
  hotspots: readonly HotspotRow[];
  hotspotsAlong: (directionId: string, line: readonly LngLat[]) => Hotspot[];
  /** A signed-in editor: Edit, Extend, Delete and the signboards show. */
  canEdit: boolean;
  /** Stands where the actions would be when an editor may not change the route. */
  notice?: ReactNode;
  onEdit: () => void;
  /** Extend, offered only for a drawn direction. */
  onExtend?: () => void;
  /** "Draw the return trip", offered only while the other way is an undrawn slot. */
  onDrawOtherWay?: () => void;
  onDelete: () => void;
  onSignboardsChanged: () => void;
}

/**
 * What the editor adds under the trip card's tiles: the route's facts with
 * its Edit, Extend and Delete, the export, and the signboards.
 */
export function TripCardExtras({
  direction,
  directions,
  hotspots,
  hotspotsAlong,
  canEdit,
  notice,
  onEdit,
  onExtend,
  onDrawOtherWay,
  onDelete,
  onSignboardsChanged,
}: TripCardExtrasProps) {
  return (
    <>
      <RouteFacts
        direction={direction}
        actions={
          canEdit ? (
            <CardActions
              editLabel="Edit route"
              onEdit={onEdit}
              onDelete={onDelete}
              onExtend={onExtend}
              onDrawOtherWay={onDrawOtherWay}
            />
          ) : (
            notice
          )
        }
      />
      <RouteExportPanel
        directions={directions.filter((v) => v.routeId === direction.routeId)}
        hotspots={hotspots}
        hotspotsAlong={hotspotsAlong}
      />
      {canEdit && <DraftSignboards direction={direction} onChanged={onSignboardsChanged} />}
    </>
  );
}
