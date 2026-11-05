import type { Session } from '@supabase/supabase-js';
import type { MapLibreMap } from 'maplibre-gl';
import { useRef, useState } from 'react';

import { useGazeHush } from '@/features/locator';
import { MapCreditsDock } from '@/features/routes/map/map-credits-dock';
import { MapCreditsSheet } from '@/features/routes/map/map-credits-sheet';
import { MapView } from '@/features/routes/map/map-view';
import { useCardCamera } from '@/features/routes/map/use-card-camera';
import { useCardStack } from '@/features/routes/map/use-card-stack';
import { useLoopTip } from '@/features/routes/map/use-loop-tip';
import { useMapCredits } from '@/features/routes/map/use-map-credits';
import { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import {
  CONTRIBUTIONS,
  lineOf,
  listDirections,
  loadHotspotsFromSupabase,
  supabaseConfigError,
  MapSwitch,
  NEW_MENU_DOCK_FOOT,
  STUDIO_BASEMAPS,
  STUDIO_BASEMAP_THUMBNAILS,
  type ContributionStart,
  type usePasswordRecovery,
  useAuthFlow,
  useDrawing,
  useFollow,
  useOpenDraft,
  useLoopClosing,
  useSaveFlow,
  useSaveTarget,
  useIsWideScreen,
  useStudioMap,
  useWheelNavigation,
  useContributionStart,
  useDeleteActions,
  useStudioTrip,
} from '@/features/studio';
import { useTurn } from '@/shared/hooks/commit-turn';

import { AccountDialogs } from './account-dialogs';
import { OtherMaps } from './other-maps';
import { PlaygroundCards } from './playground-cards';
import { PlaygroundSaveSheets } from './playground-save-sheets';
import { PlaygroundTools } from './playground-tools';
import { WorkshopLocation } from './workshop-location';

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
  // On a computer the wheel pans and Ctrl/⌘+wheel zooms, as in Figma.
  useWheelNavigation(map);
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
  const { isSignedIn, isAccountDialogOpen, openSignIn } = auth;

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
  const { isSaving, setIsSaving, setNotice } = saveFlow;
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
  const { root, ride } = camera;

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
  // A draft tapped on the map opens into editing: Edit route on the editor's own, the card on
  // another editor's; the rest wait in Drafts.
  const handleOpenDraft = useOpenDraft({
    directions: saved.directions,
    userId: session?.user.id ?? null,
    draw,
    opening,
    openTrip: cards.openTrip,
  });

  // A return trip starts where the other way ended, shows it faintly, and can close the loop.
  const { startReturnTrip } = useLoopClosing(
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

  // On a computer, a signed-in editor's sidebar stands beside the map the whole
  // time a route or a hotspot is drawn, and its saves are Done. Not while Extend
  // is still choosing where to leave a line: there is no line yet.
  const isWideScreen = useIsWideScreen();
  const isBeside = isWideScreen && isPlayground && isSignedIn && draw.drawing && !draw.picking;

  // While a save sheet or an account dialog is open over the map, nothing
  // behind it can be reached: the drawing's toolbar would change the line
  // under the form. Shown on the same conditions as StudioSaveSheets and
  // AuthDialogs. The form beside the map is no sheet: the map stays live.
  const isSheetOpen =
    (isPlayground && isSaving && draw.drawing && !isBeside) || isAccountDialogOpen;

  // Delete on the trip's card and the hotspot's: signed out, it asks for sign-in.
  const deletes = useDeleteActions({
    signedIn: isSignedIn,
    onSignInNeeded: openSignIn,
    saved,
    hotspots,
    setNotice,
  });

  // The map's credits, opened by its ⓘ as on the public map: the page is out of reach under them.
  const credits = useMapCredits(root);
  const [draftsSlot, setDraftsSlot] = useState<HTMLDivElement | null>(null);

  return (
    <div className="relative flex h-full w-full flex-col">
      <div inert={credits.state === 'open'} className="contents">
        {/* The studio's top bar: everything on the map starts below it. Provisional until the owner's Figma frame. */}
        <div className="relative flex h-[calc(3rem+env(safe-area-inset-top))] shrink-0 items-center justify-center border-b border-border-primary bg-surface px-4 pt-[env(safe-area-inset-top)]">
          <MapSwitch ref={switchRef} value={studioMap} onChange={chooseStudioMap} />
          {/* Drafts, on a computer: in the bar, clear of the map's controls (StudioReview). */}
          <div ref={setDraftsSlot} className="absolute right-4 bottom-0 flex h-12 items-center" />
        </div>
        {/* The route's form left of the map while a line is drawn on a computer, and the map. */}
        <div className="flex min-h-0 flex-1">
          {/* Outside the map's box, so a full-screen panel covers the band too; on a computer, before the map in this row: the form is read first, left of the map. */}
          <PlaygroundSaveSheets
            isPlayground={isPlayground}
            isBeside={isBeside}
            draw={draw}
            saved={saved}
            hotspots={hotspots}
            target={target}
            saveFlow={saveFlow}
            contribution={contribution}
          />
          {/* `data-dock-host`: the open card's sheet says where its top is here, for the pill to follow (BottomSheet); the New + says what it stands in the corner. */}
          <div
            ref={root}
            data-map-box
            data-dock-host
            inert={isSheetOpen}
            className={
              '@container relative min-w-0 flex-1 overflow-clip' +
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
                labelsPlace="studio"
                areCreditsShown={credits.isSheetMissing}
              />
              {/* The public map's ⓘ, in its place at the map's bottom left; MapLibre's corner credits step aside. */}
              {!credits.isSheetMissing && (
                <MapCreditsDock
                  isDocked={cards.open}
                  onOpen={credits.open}
                  buttonRef={credits.buttonRef}
                />
              )}
              <WorkshopLocation
                map={map}
                isMapLoaded={isMapLoaded}
                saved={saved}
                hotspots={hotspots}
                cards={cards}
                camera={camera}
                cameraTurn={locatorTurn}
                hushedAt={hushedAt}
              />
            </div>

            {/* A config or load problem is a banner, never a blank page. */}
            {(supabaseConfigError || saved.error || hotspots.error) && (
              <div className="absolute top-[calc(1rem+var(--map-safe-top))] left-1/2 z-20 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-900 shadow ring-1 ring-amber-200">
                {supabaseConfigError ??
                  `Couldn't load saved routes: ${saved.error ?? hotspots.error}`}
              </div>
            )}

            <OtherMaps
              studioMap={studioMap}
              isContributors={isContributors}
              map={map}
              userId={session?.user.id}
              isSignedIn={isSignedIn}
              hasLine={draw.drawing}
              onSignIn={openSignIn}
              onOpenPlayground={handleOpenPlayground}
              onContributionStart={handleContributionStart}
            />

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
                draftsSlot={isWideScreen ? draftsSlot : null}
                onOpenDraft={handleOpenDraft}
                session={session}
                auth={auth}
                draw={draw}
                saved={saved}
                hotspots={hotspots}
                routeCount={trip.routeCount}
                saveFlow={saveFlow}
                contribution={contribution}
                extendEnds={extendEnds}
                isPlayground={isPlayground}
                isChoosing={choosing}
                isNewMenuOpen={isNewMenuOpen}
                onNewMenuOpenChange={setIsNewMenuOpen}
                onDone={isBeside ? undefined : onDone}
              />
            </div>
          </div>
        </div>
      </div>
      <MapCreditsSheet credits={credits} />
      <AccountDialogs session={session} auth={auth} recovery={recovery} />
    </div>
  );
}
