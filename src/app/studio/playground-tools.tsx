import type { Session } from '@supabase/supabase-js';
import type { MapLibreMap } from 'maplibre-gl';

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
  StudioReview,
  ContributionHint,
  type useAuthFlow,
  type useContributionStart,
  type useDrawing,
  type useLoopClosing,
  type useSaveFlow,
  type useSaveTarget,
} from '@/features/studio';

interface PlaygroundToolsProps {
  map: MapLibreMap | null;
  session: Session | null;
  auth: ReturnType<typeof useAuthFlow>;
  draw: ReturnType<typeof useDrawing>;
  saved: ReturnType<typeof useSavedRoutes<DirectionRow>>;
  hotspots: ReturnType<typeof useSavedHotspots<HotspotRow>>;
  routeCount: number;
  saveFlow: ReturnType<typeof useSaveFlow>;
  contribution: ReturnType<typeof useContributionStart>;
  extendEnds: ReturnType<typeof useSaveTarget>['extendEnds'];
  loop: ReturnType<typeof useLoopClosing>['loop'];
  isPlayground: boolean;
  isChoosing: boolean;
  isNewMenuOpen: boolean;
  onNewMenuOpenChange: (isOpen: boolean) => void;
  canDrawReturnTrip: boolean;
  onDrawReturnTrip: (routeId: string) => void;
  onDone: () => void;
}

/**
 * The Playground's tools over the map: the account pill, the review, an
 * upload's hint, the saved toasts, and the drawing's toolbar or the New +.
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
  loop,
  isPlayground,
  isChoosing,
  isNewMenuOpen,
  onNewMenuOpenChange,
  canDrawReturnTrip,
  onDrawReturnTrip,
  onDone,
}: PlaygroundToolsProps) {
  const {
    isSignedIn,
    isSigningIn,
    setIsSigningIn,
    isChangingPassword,
    setIsChangingPassword,
    isResetting,
  } = auth;
  const { isSaving, toast, setToast } = saveFlow;

  return (
    <>
      {!draw.drawing && !saved.selected && !hotspots.selected && !isChoosing && (
        <AccountPill
          routes={routeCount}
          hotspots={hotspots.hotspots.length > 0 ? hotspotCount(hotspots.hotspots) : 0}
          email={session ? (session.user.email ?? '') : null}
          onSignIn={() => setIsSigningIn(true)}
          onPassword={() => setIsChangingPassword(true)}
          onSignOut={() => void getSupabase()?.auth.signOut()}
        />
      )}

      {isSignedIn &&
        !draw.drawing &&
        !isSaving &&
        !isSigningIn &&
        !isChangingPassword &&
        !isResetting && (
          <StudioReview
            key={session?.user.id}
            map={map}
            onChanged={() => {
              void saved.reload();
              void hotspots.reload();
            }}
          />
        )}

      {contribution.start && (
        <ContributionHint start={contribution.start} onForget={contribution.forget} />
      )}

      <SaveToasts
        toast={toast}
        isDrawing={draw.drawing}
        canDrawReturnTrip={canDrawReturnTrip}
        onDismiss={() => setToast(null)}
        onDrawReturnTrip={(routeId) => {
          setToast(null);
          onDrawReturnTrip(routeId);
        }}
      />

      {draw.drawing ? (
        <DrawToolbar
          draw={draw}
          onDone={onDone}
          keys={isPlayground && !isSaving && !isSigningIn && !isChangingPassword && !isResetting}
          ends={extendEnds}
          loop={loop}
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
