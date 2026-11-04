import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { Button } from '@/design-system/primitives/button';
import type { Hotspot, HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import type { LngLat } from '@/shared/utils/geo';

import { CardActions } from './card-actions';
import { RouteExportPanel } from './route-export-panel';
import { RouteFacts } from './route-facts';
import { SignboardEditor } from './signboard-editor';
import { STUDIO_DRAFTS } from '../data/flags';
import { reviewKeys } from '../data/review-keys';
import { draftedSignboards } from '../data/signboards';
import { useRouteDraftQuery } from '../data/use-route-draft-query';

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

interface DraftSignboardsProps {
  direction: DirectionRow;
  onChanged: () => void;
}

/**
 * The signboards as the editor's own draft of the route lists them, when it
 * does: a change is saved on top of the draft, so starting from the approved
 * list would drop the boards the draft added. Shown only once the draft is
 * read, so nothing is changed on a list about to be replaced.
 */
function DraftSignboards({ direction, onChanged }: DraftSignboardsProps) {
  const client = useQueryClient();
  const draft = useRouteDraftQuery(direction.routeId);
  if (STUDIO_DRAFTS && draft.isPending)
    return (
      <p role="status" className="px-3 pb-4 font-sn-pro text-sm text-content-quaternary">
        Loading signboards…
      </p>
    );
  if (draft.isError)
    return (
      <div className="flex flex-col items-start gap-2 px-3 pb-4 font-sn-pro">
        <p role="alert" className="text-sm text-content-error">
          Couldn&apos;t read your draft&apos;s signboards. Try again before changing them.
        </p>
        <Button variant="secondary" label="Try again" onClick={() => void draft.refetch()} />
      </div>
    );
  const drafted = draftedSignboards(draft.data ?? null, direction.id);
  const handleChanged = () => {
    void client.invalidateQueries({ queryKey: reviewKeys.draftOf('route', direction.routeId) });
    onChanged();
  };
  return (
    <SignboardEditor
      direction={drafted ? { ...direction, signboards: drafted } : direction}
      onChanged={handleChanged}
    />
  );
}
