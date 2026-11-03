import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import {
  StudioSaveSheets,
  type useContributionStart,
  type useDrawing,
  type useSaveFlow,
  type useSaveTarget,
} from '@/features/studio';

interface PlaygroundSaveSheetsProps {
  isPlayground: boolean;
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
  draw,
  saved,
  hotspots,
  target,
  saveFlow,
  contribution,
}: PlaygroundSaveSheetsProps) {
  const { isSaving, setIsSaving, onSaved, onSavedHotspot, onDrafted } = saveFlow;

  return (
    <div inert={!isPlayground} className={isPlayground ? 'contents' : 'hidden'}>
      <StudioSaveSheets
        isSaving={isSaving}
        draw={draw}
        saved={saved}
        hotspots={hotspots}
        target={target}
        onSaved={(v) => {
          void contribution.recordSaved(v.id, draw.controlPoints);
          onSaved(v);
        }}
        onSavedHotspot={(s) => {
          void contribution.recordSaved(s.id, draw.controlPoints);
          onSavedHotspot(s);
        }}
        onDrafted={(subjectId) => {
          void contribution.recordSaved(subjectId, draw.controlPoints);
          onDrafted();
        }}
        onCancel={() => setIsSaving(false)}
      />
    </div>
  );
}
