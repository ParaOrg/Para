import type { Session } from '@supabase/supabase-js';
import type { MapLibreMap } from 'maplibre-gl';
import type { ComponentProps } from 'react';

import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import type { HotspotRow } from '@/features/routes/model/hotspots';
import { hotspotCount } from '@/features/routes/model/places';
import type { DirectionRow } from '@/features/routes/model/routes';
import {
  getSupabase,
  AccountPill,
  NewMenu,
  DrawToolbar,
  SaveToasts,
  StudioDrafts,
  ContributionHint,
  type useAuthFlow,
  type useContributionStart,
  type useDrawing,
  type useSaveFlow,
  type useSaveTarget,
} from '@/features/studio';

interface PlaygroundToolsProps {
  map: MapLibreMap | null;
  /** A draft tapped on the map, opened into its sidebar (useOpenDraft). */
  onOpenDraft: ComponentProps<typeof StudioDrafts>['onOpenDraft'];
  session: Session | null;
  auth: ReturnType<typeof useAuthFlow>;
  draw: ReturnType<typeof useDrawing>;
  saved: ReturnType<typeof useSavedRoutes<DirectionRow>>;
  hotspots: ReturnType<typeof useSavedHotspots<HotspotRow>>;
  routeCount: number;
  saveFlow: ReturnType<typeof useSaveFlow>;
  contribution: ReturnType<typeof useContributionStart>;
  extendEnds: ReturnType<typeof useSaveTarget>['extendEnds'];
  isPlayground: boolean;
  isChoosing: boolean;
  isNewMenuOpen: boolean;
  onNewMenuOpenChange: (isOpen: boolean) => void;
  /** Done on the toolbar; absent while the route's form stands beside the map, whose Save is Done. */
  onDone?: () => void;
}

/**
 * The Playground's tools over the map: the account pill, the drafts on the map, an
 * upload's hint, the toast, and the drawing's toolbar or the New +.
 */
export function PlaygroundTools({
  map,
  session,
  auth,
  draw,
  saved,
  hotspots,
  routeCount,
  saveFlow,
  contribution,
  extendEnds,
  isPlayground,
  isChoosing,
  isNewMenuOpen,
  onNewMenuOpenChange,
  onDone,
  onOpenDraft,
}: PlaygroundToolsProps) {
  const { isSignedIn, isAccountDialogOpen, openSignIn, openPasswordChange } = auth;
  const { isSaving, toast, setToast } = saveFlow;

  return (
    <>
      {!draw.drawing && !saved.selected && !hotspots.selected && !isChoosing && (
        <AccountPill
          routes={routeCount}
          hotspots={hotspots.hotspots.length > 0 ? hotspotCount(hotspots.hotspots) : 0}
          email={session ? (session.user.email ?? '') : null}
          onSignIn={openSignIn}
          onPassword={openPasswordChange}
          onSignOut={() => void getSupabase()?.auth.signOut()}
        />
      )}

      {isSignedIn && !draw.drawing && !isSaving && !isAccountDialogOpen && (
        <StudioDrafts key={session?.user.id} map={map} onOpenDraft={onOpenDraft} />
      )}

      {contribution.start && (
        <ContributionHint start={contribution.start} onForget={contribution.forget} />
      )}

      <SaveToasts toast={toast} onDismiss={() => setToast(null)} />

      {draw.drawing ? (
        <DrawToolbar
          draw={draw}
          onDone={onDone}
          keys={isPlayground && !isSaving && !isAccountDialogOpen}
          ends={extendEnds}
        />
      ) : isChoosing ? null : (
        /*
          Drawing needs no account; saving does, and asks for it at Done. Not
          while the route list is open, as the account pill is not: under
          1024 px wide the list docks along the bottom, and these would stand
          on its corner.
        */
        <NewMenu
          isReady={!!map}
          isOpen={isNewMenuOpen}
          onOpenChange={onNewMenuOpenChange}
          onNewRoute={() => draw.start()}
          onNewHotspot={(kind) => draw.startArea(kind)}
        />
      )}
    </>
  );
}
