import type { Session } from '@supabase/supabase-js';
import type { MapLibreMap } from 'maplibre-gl';
import { useRef, useState } from 'react';

import { CommuterLocation, useGazeHush } from '@/features/locator';
import { MapView } from '@/features/routes/map/map-view';
import { useCardCamera } from '@/features/routes/map/use-card-camera';
import { useCardStack } from '@/features/routes/map/use-card-stack';
import { useLoopTip } from '@/features/routes/map/use-loop-tip';
import { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import {
  CONTRIBUTIONS,
  lineOf,
  listDirections,
  loadHotspotsFromSupabase,
  supabaseConfigError,
  returnTripLeft,
  AuthDialogs,
  MapPlaceholder,
  MapSwitch,
  NEW_MENU_DOCK_FOOT,
  STUDIO_BASEMAPS,
  STUDIO_BASEMAP_THUMBNAILS,
  StudioSaveSheets,
  StudioContributors,
  type ContributionStart,
  StudioPublicView,
  type usePasswordRecovery,
  useAuthFlow,
  useDrawing,
  useFollow,
  useLoopClosing,
  useSaveFlow,
  useSaveTarget,
  useStudioMap,
  useContributionStart,
  useDeleteActions,
  useStudioTrip,
} from '@/features/studio';
import { useTurn } from '@/shared/hooks/commit-turn';

import { PlaygroundCards } from './playground-cards';
import { PlaygroundTools } from './playground-tools';

interface WorkshopProps {
  session: Session | null;
  recovery: ReturnType<typeof usePasswordRecovery>;
}

/**
 * The map and every editing tool, for a signed-in editor or a test session.
 * The composition root: the state and the hooks' results passed down. What
 * it decides lives in the studio's panels: the return-trip offer
 * (return-trip.ts), a route's end refusing a delete (hotspot-in-use.ts), the
 * deletes themselves (use-delete-actions.ts), the saved toasts
 * (save-toasts.tsx) and what the trip card adds for an editor
 * (trip-card-extras.tsx).
 */
export function Workshop({ session, recovery }: WorkshopProps) {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  // Which of the three maps is shown. Only the Playground has tools: the others
  // stay behind the one map and its state, so a switch keeps the camera, the
  // basemap and a half-drawn line.
  const { studioMap, chooseStudioMap } = useStudioMap();
  const isPlayground = studioMap === 'playground';
  // The Contributors map draws on the studio's own map, so it stays live there.
  const isContributors = CONTRIBUTIONS && studioMap === 'contributors';
  const switchRef = useRef<HTMLDivElement>(null);
  const handleOpenPlayground = () => {
    chooseStudioMap('playground');
    // The button that was pressed leaves with the placeholder; focus goes to the switch.
    switchRef.current?.querySelector<HTMLInputElement>('input[value="playground"]')?.focus();
  };
  // Sign-in, the password change and a reset link's (useAuthFlow).
  const auth = useAuthFlow(session, recovery);
  const {
    isSignedIn,
    isSigningIn,
    isChangingPassword,
    isResetting,
    isAccountDialogOpen,
    openSignIn,
    closeAccountDialog,
  } = auth;

  // A right-click on a saved line while drawing: decided below, once the
  // saved lines and hotspots are loaded (onFollow).
  const draw = useDrawing(map, { onFollow: (ids, at, offered) => onFollow(ids, at, offered) });
  // The list rows, each with its overview (0009): a direction's full line is
  // read when it is lit or chosen, its drawing when it is opened (below).
  const saved = useSavedRoutes(map, listDirections, {
    drawing: draw.drawing,
    hiddenDirectionId: draw.target.directionId,
    loadLine: lineOf,
  });
  const hotspots = useSavedHotspots(map, loadHotspotsFromSupabase, {
    drawing: draw.drawing,
    hiddenHotspotId: draw.area?.hotspotId ?? null,
    // While a trip is open, the map lights only the trip, as on the public map.
    muted: !!saved.selected,
  });
  // The save panels and the toast, one at a time, the newest: a save's, or a
  // problem (useSaveFlow).
  const saveFlow = useSaveFlow({
    isDrawing: draw.drawing,
    recoveryError: recovery.error,
    cancelDrawing: draw.cancel,
    reloadRoutes: saved.reload,
    reloadHotspots: hotspots.reload,
  });
  const { isSaving, setIsSaving, setNotice, justSaved, onSaved, onSavedHotspot, onDrafted } =
    saveFlow;
  // A drawing begun from an upload (Use this line, Draw a hintuan here), and the
  // record of which uploads its save came from (contributors/actions).
  const contribution = useContributionStart({ map, draw, setNotice });
  const handleContributionStart = (start: ContributionStart) => {
    chooseStudioMap('playground');
    contribution.begin(start);
  };
  // The route list, a hotspot's card and the trip opened from either, as on
  // the public map (useCardStack).
  const cards = useCardStack(map, saved, hotspots);
  // Where an open ikot's trip leaves from: the place whose card it was opened
  // from, else its first. The studio has no commuter's position to start from.
  const tipId = useLoopTip(saved.selected, hotspots, {
    where: null,
    openedFrom: hotspots.selected,
  });
  // The camera with the cards, as on the public map (useCardCamera), so the
  // studio has the public map's interaction. A hintuan picked on the trip
  // card, the camera gliding there clear of the card and a circle popping up
  // on it, the route left whole, the card staying at its height; a trip
  // opened on its whole route, a RouteCard picked, SWITCH and the sheet
  // settled at another height, each framed beside the card; and the camera
  // from before a hotspot's RouteCard was picked, back as it is let go.
  const camera = useCardCamera(map, saved, hotspots, cards, { tipId });
  const { root, ride, clearOfOpen } = camera;

  // The pill's camera moves at this page's turn, after the cards' camera
  // (commit-turn.ts); the dot's gaze is hushed by ‹ and ✕ (dot-gaze.ts).
  const locatorTurn = useTurn();
  const { hush, hushedAt } = useGazeHush();
  // Its 'load' in and not failed: the map-style button waits for it.
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const trip = useStudioTrip({
    map,
    saved,
    hotspots,
    hiddenDirectionId: draw.target.directionId,
    ride,
    tipId,
  });

  // Every editor edits every route and hotspot (migration 0015). There is no
  // sign-up, so a session is an editor's; the database refuses anyone else's
  // writes whatever this shows.
  const canEdit = isSignedIn;

  // What the save panel saves into, and where the drawing is headed.
  const target = useSaveTarget(draw, saved.directions, hotspots.hotspots);
  const { extendEnds } = target;
  // A right-click on saved lines while drawing, and opening a direction's drawing.
  const { onFollow, opening } = useFollow({
    draw,
    directions: saved.directions,
    hotspots: hotspots.hotspots,
    target,
    setNotice,
  });

  // A return trip starts where the other way ended, shows it faintly, and can close the loop.
  const { loop, startReturnTrip } = useLoopClosing(
    map,
    draw,
    target.editing ? null : (target.parentRoute?.id ?? null),
    target.slotReversed,
    saved.directions,
    hotspots.hotspots,
  );

  const onDone = () => {
    if (!isSignedIn) openSignIn();
    else setIsSaving(true);
  };

  const { choosing } = cards;

  // While a save sheet or an account dialog is open over the map, nothing
  // behind it can be reached: the drawing's toolbar would change the line
  // under the form. Shown on the same conditions as StudioSaveSheets and AuthDialogs.
  const isSheetOpen = (isPlayground && isSaving && draw.drawing) || isAccountDialogOpen;

  // "Draw the return trip" only while the route still has a way undrawn.
  const slotLeft = returnTripLeft(justSaved, saved.directions);

  // Delete on the trip's card and the hotspot's: signed out, it asks for sign-in.
  const deletes = useDeleteActions({
    signedIn: isSignedIn,
    onSignInNeeded: openSignIn,
    saved,
    hotspots,
    setNotice,
  });

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* The studio's top bar: everything on the map starts below it. Provisional until the owner's Figma frame. */}
      <div className="flex h-[calc(3rem+env(safe-area-inset-top))] shrink-0 items-center justify-center border-b border-border-primary bg-surface px-4 pt-[env(safe-area-inset-top)]">
        <MapSwitch ref={switchRef} value={studioMap} onChange={chooseStudioMap} />
      </div>
      {/* `data-dock-host`: the open card's sheet says where its top is here, for the pill to follow (BottomSheet); the New + says what it stands in the corner. */}
      <div
        ref={root}
        data-map-box
        data-dock-host
        inert={isSheetOpen}
        className={
          '@container relative min-h-0 flex-1 overflow-clip' +
          (!draw.drawing && !choosing ? ' ' + NEW_MENU_DOCK_FOOT : '')
        }
      >
        {/* Inert on the other maps, so a keyboard cannot pan the camera that waits there. */}
        <div inert={!isPlayground && !isContributors} className="contents">
          <MapView
            onReady={setMap}
            onLoadedChange={setIsMapLoaded}
            foldCredits
            basemaps={STUDIO_BASEMAPS}
            basemapThumbnails={STUDIO_BASEMAP_THUMBNAILS}
            hasMapStyleButton={false}
          />
          {/*
            The commuter's own position and the map's design, one pill, as on
            the public map: the studio sees the map the way a commuter does.
          */}
          <CommuterLocation
            map={map}
            isMapLoaded={isMapLoaded}
            basemaps={STUDIO_BASEMAPS}
            basemapThumbnails={STUDIO_BASEMAP_THUMBNAILS}
            snap={cards.snap}
            offset={clearOfOpen}
            docked={cards.open}
            cameraTurn={locatorTurn}
            picks={{
              pickedId: ride.pickedId,
              pinAt: ride.pinAt,
              place: hotspots.selected,
              trip: saved.selected,
              highlight: saved.highlight,
              candidates: saved.candidates,
              litDirections: saved.litDirections,
            }}
            hushedAt={hushedAt}
          />
        </div>

        {/* A config or load problem is a banner, never a blank page. */}
        {(supabaseConfigError || saved.error || hotspots.error) && (
          <div className="absolute top-[calc(1rem+var(--map-safe-top))] left-1/2 z-20 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-900 shadow ring-1 ring-amber-200">
            {supabaseConfigError ?? `Couldn't load saved routes: ${saved.error ?? hotspots.error}`}
          </div>
        )}

        {isContributors && (
          <StudioContributors
            key={session?.user.id}
            map={map}
            isSignedIn={isSignedIn}
            onSignIn={openSignIn}
            onOpenPlayground={handleOpenPlayground}
            onStart={handleContributionStart}
          />
        )}
        {studioMap === 'public' ? (
          <StudioPublicView hasLine={draw.drawing} onOpenPlayground={handleOpenPlayground} />
        ) : (
          !isContributors &&
          !isPlayground && (
            <MapPlaceholder
              map={studioMap}
              hasLine={draw.drawing}
              onOpenPlayground={handleOpenPlayground}
            />
          )
        )}

        {/* Out of the page's reach, not unmounted, on the other maps. */}
        <div inert={!isPlayground} className={isPlayground ? 'contents' : 'hidden'}>
          <PlaygroundCards
            map={map}
            draw={draw}
            saved={saved}
            hotspots={hotspots}
            cards={cards}
            camera={camera}
            trip={trip}
            canEdit={canEdit}
            opening={opening}
            deletes={deletes}
            hush={hush}
            onDrawReturnTrip={startReturnTrip}
          />
          <PlaygroundTools
            map={map}
            session={session}
            auth={auth}
            draw={draw}
            saved={saved}
            hotspots={hotspots}
            routeCount={trip.routeCount}
            saveFlow={saveFlow}
            contribution={contribution}
            extendEnds={extendEnds}
            loop={loop}
            isPlayground={isPlayground}
            isChoosing={choosing}
            isNewMenuOpen={isNewMenuOpen}
            onNewMenuOpenChange={setIsNewMenuOpen}
            canDrawReturnTrip={slotLeft}
            onDrawReturnTrip={startReturnTrip}
            onDone={onDone}
          />
        </div>
      </div>
      {/* Outside the map's box, so a full-screen panel covers the band too. */}
      {/* On every map: the Contributors map asks for a sign-in too. */}
      <AuthDialogs
        signingIn={isSigningIn}
        onSignInDismiss={closeAccountDialog}
        resetting={isResetting}
        isInvite={recovery.isInvite}
        onResetDone={recovery.done}
        changingPasswordFor={
          isChangingPassword && !isResetting ? (session?.user.email ?? null) : null
        }
        onPasswordDone={closeAccountDialog}
      />
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
    </div>
  );
}
