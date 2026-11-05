import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import {
  StudioSaveSheets,
  type useLoopClosing,
  type useContributionStart,
  type useDrawing,
  type useSaveFlow,
  type useSaveTarget,
} from '@/features/studio';

interface PlaygroundSaveSheetsProps {
  isPlayground: boolean;
  /** A route's form beside the map while it is drawn (StudioSaveSheets). */
  isBeside: boolean;
  /** While a return trip is drawn: where the loop closes, for the sidebar's Close the loop. */
  loop: ReturnType<typeof useLoopClosing>['loop'];
  draw: ReturnType<typeof useDrawing>;
  saved: ReturnType<typeof useSavedRoutes<DirectionRow>>;
  hotspots: ReturnType<typeof useSavedHotspots<HotspotRow>>;
  target: ReturnType<typeof useSaveTarget>;
  saveFlow: ReturnType<typeof useSaveFlow>;
  contribution: ReturnType<typeof useContributionStart>;
}

/**
 * The Playground's save sheets, out of the page's reach, not unmounted, on the
 * other maps. A save also records which uploads its drawing came from.
 */
export function PlaygroundSaveSheets({
  isPlayground,
  isBeside,
  loop,
  draw,
  saved,
  hotspots,
  target,
  saveFlow,
  contribution,
}: PlaygroundSaveSheetsProps) {
  const { isSaving, setIsSaving, onDrafted, onPublished, onUnpublished } = saveFlow;

  return (
    <div inert={!isPlayground} className={isPlayground ? 'contents' : 'hidden'}>
      <StudioSaveSheets
        isSaving={isSaving}
        isBeside={isBeside}
        loop={loop}
        draw={draw}
        saved={saved}
        hotspots={hotspots}
        target={target}
        onDrafted={(subjectId) => {
          void contribution.recordSaved(subjectId, draw.controlPoints);
          onDrafted();
        }}
        onUnpublished={onUnpublished}
        onPublished={(subjectId) => {
          void contribution.recordSaved(subjectId, draw.controlPoints);
          onPublished();
        }}
        onCancel={() => setIsSaving(false)}
      />
    </div>
  );
}
