import type { Session } from '@supabase/supabase-js';
import type { MapLibreMap } from 'maplibre-gl';
import { useRef, useState } from 'react';

import { useGazeHush } from '@/features/locator';
import { isChoosing } from '@/features/routes/cards/card-stack';
import { MapCreditsDock } from '@/features/routes/map/map-credits-dock';
import { MapCreditsSheet } from '@/features/routes/map/map-credits-sheet';
import { MapView } from '@/features/routes/map/map-view';
import { useMapCredits } from '@/features/routes/map/use-map-credits';
import { useRouteCards } from '@/features/routes/map/use-route-cards';
import { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import { directionsAtHotspots } from '@/features/routes/model/directions-at';
import {
  CONTRIBUTIONS,
  DRAFT_LINES_HIT,
  lineOf,
  listDirections,
  loadHotspotsFromSupabase,
  supabaseConfigError,
  NEW_MENU_DOCK_FOOT,
  STUDIO_BASEMAPS,
  STUDIO_BASEMAP_THUMBNAILS,
  StudioSearch,
  type ContributionStart,
  type usePasswordRecovery,
  useAuthFlow,
  useDrawing,
  useFollow,
  useOpenDraft,
  useDraftOnly,
  useDraftTrip,
  useLoopClosing,
  useSaveFlow,
  useSaveTarget,
  useIsWideScreen,
  useStudioMap,
  useWheelNavigation,
  useContributionStart,
  useDeleteActions,
} from '@/features/studio';
import { isRidePickingOn } from '@/shared/config/env';
import { useTurn } from '@/shared/hooks/commit-turn';

import { AccountDialogs } from './account-dialogs';
import { OtherMaps } from './other-maps';
import { PlaygroundCards } from './playground-cards';
import { PlaygroundSaveSheets } from './playground-save-sheets';
import { PlaygroundTools } from './playground-tools';
import { HOTSPOT_MARKS, STUDIO_MAP_VIEW } from './studio-map-marks';
import { StudioTopBar } from './studio-top-bar';
import { WorkshopLocation } from './workshop-location';

/** A draft's dashed line is DraftLines' to open: a tap on it is not an empty one. */
const DRAFT_TAP_LAYERS = [DRAFT_LINES_HIT];

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
  const [leftPanel, setLeftPanel] = useState<HTMLDivElement | null>(null);
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
    ...HOTSPOT_MARKS,
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
  // Routes and hotspots that are drafts only: the sidebar opens on them as on approved ones.
  const draftOnly = useDraftOnly({
    isSignedIn,
    directions: saved.directions,
    hotspots: hotspots.hotspots,
  });
  const isWideScreen = useIsWideScreen();
  // A route that is a draft only, open in its route line detail (useDraftTrip): read before the
  // cards, which close it with the empty map tapped and Back, as they leave a trip.
  const draftTrip = useDraftTrip({
    draftDirections: draftOnly.directions,
    isCardOpen:
      !!saved.selected || !!hotspots.selected || isChoosing(saved.candidates, hotspots.candidates),
    isDrawing: draw.drawing,
    isWideScreen,
  });
  const { hush, hushedAt } = useGazeHush();
  // The public map's route cards (useRouteCards), out of play while a line is drawn and on the
  // other maps. The studio has no commuter's position to start a loop's trip from.
  const routeCards = useRouteCards(map, saved, hotspots, {
    hush,
    isRidePickingOn,
    isActive: isPlayground && !draw.drawing,
    ownCard: draftTrip.trip,
    ownLayers: DRAFT_TAP_LAYERS,
    hiddenDirectionId: draw.target.directionId,
    isBesideCredits: true,
    isTripBeside: isWideScreen,
  });
  const { cards, camera } = routeCards;
  const { root } = camera;

  // The pill's camera moves at this page's turn, after the cards' camera (commit-turn.ts).
  const locatorTurn = useTurn();
  // Its 'load' in and not failed: the map-style button waits for it.
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Every editor edits every route and hotspot (migration 0015). There is no
  // sign-up, so a session is an editor's; the database refuses anyone else's
  // writes whatever this shows.
  const canEdit = isSignedIn;

  // What the save panel saves into, and where the drawing is headed.
  const target = useSaveTarget(
    draw,
    [...saved.directions, ...draftOnly.directions],
    hotspots.hotspots,
  );
  const { extendEnds } = target;
  // A right-click on saved lines while drawing, and opening a direction's drawing.
  const { onFollow, opening } = useFollow({
    draw,
    directions: saved.directions,
    hotspots: hotspots.hotspots,
    target,
    setNotice,
  });
  // A draft tapped on the map opens to read first, its route line detail on a computer; editing
  // starts from Edit Route (useOpenDraft).
  const openDraft = useOpenDraft({
    saved,
    draftDirections: draftOnly.directions,
    hotspots: hotspots.hotspots,
    draftHotspots: draftOnly.hotspots,
    userId: session?.user.id ?? null,
    draw,
    opening,
    cards,
    openPlace: camera.openPlace,
    setNotice,
    draftTrip,
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

  // On a computer, a signed-in editor's sidebar stands beside the map the whole
  // time a route or a hotspot is drawn, and its saves are Done. Not while Extend
  // is still choosing where to leave a line: there is no line yet.
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
  const reloadMap = () => void Promise.all([saved.reload(), hotspots.reload()]);

  return (
    <div className="relative flex h-full w-full flex-col">
      <div inert={credits.state === 'open'} className="contents">
        <div className="flex min-h-0 flex-1">
          {/* On a computer the left panel area, the full height, read first; outside the map's column, so a phone's full-screen panel covers the top bar too. */}
          <PlaygroundSaveSheets
            isPlayground={isPlayground}
            isBeside={isBeside}
            draw={draw}
            saved={saved}
            hotspots={hotspots}
            target={target}
            saveFlow={saveFlow}
            contribution={contribution}
            draftHotspots={draftOnly.hotspots}
          />
          <div ref={setLeftPanel} className={isPlayground ? 'contents' : 'hidden'} />
          <div className="flex min-w-0 flex-1 flex-col">
            <StudioTopBar ref={switchRef} value={studioMap} onChange={chooseStudioMap} />
            {/* `data-dock-host`: the open card's sheet says where its top is here at rest, and on what follows it (`data-dock-follower`) as a finger drags it (BottomSheet); the New + says what it stands in the corner. */}
            <div
              ref={root}
              data-map-box
              data-dock-host
              inert={isSheetOpen}
              className={
                'group/map @container relative min-h-0 min-w-0 flex-1 overflow-clip' +
                (!draw.drawing && !cards.choosing ? ' ' + NEW_MENU_DOCK_FOOT : '')
              }
            >
              {/* Inert on the other maps, so a keyboard cannot pan the camera that waits there. */}
              <div inert={!isPlayground && !isContributors} className="contents">
                <MapView
                  onReady={setMap}
                  onLoadedChange={setIsMapLoaded}
                  {...STUDIO_MAP_VIEW}
                  showsDiagnostics
                  basemaps={STUDIO_BASEMAPS}
                  basemapThumbnails={STUDIO_BASEMAP_THUMBNAILS}
                  areCreditsShown={credits.isSheetMissing}
                />
                {/* The public map's ⓘ, at the map's bottom left; MapLibre's corner credits step aside. */}
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
                  routeCards={routeCards}
                  isPlayground={isPlayground}
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

              {/*
              Place search (ticket 05) on the workshop and the Contributors map; the Public map's
              own search serves that view. A card opens only in the workshop.
            */}
              {(isPlayground || isContributors) && (
                <StudioSearch
                  map={map}
                  hotspots={hotspots.hotspots}
                  isSignedIn={isSignedIn}
                  directionsAt={directionsAtHotspots(saved.directions, hotspots.linkedDirectionIds)}
                  isDrawing={draw.drawing}
                  onOpenHotspot={isPlayground ? camera.openPlace : undefined}
                  onSubjectChanged={isPlayground ? reloadMap : undefined}
                />
              )}

              {/* Out of the page's reach, not unmounted, on the other maps. */}
              <div inert={!isPlayground} className={isPlayground ? 'contents' : 'hidden'}>
                <PlaygroundCards
                  map={map}
                  draw={draw}
                  saved={saved}
                  hotspots={hotspots}
                  routeCards={routeCards}
                  canEdit={canEdit}
                  isWideScreen={isWideScreen}
                  leftPanel={leftPanel}
                  draftTrip={draftTrip.trip}
                  opening={opening}
                  deletes={deletes}
                  onDrawReturnTrip={startReturnTrip}
                />
                <PlaygroundTools
                  map={map}
                  onOpenDraft={openDraft}
                  session={session}
                  auth={auth}
                  draw={draw}
                  saved={saved}
                  hotspots={hotspots}
                  saveFlow={saveFlow}
                  contribution={contribution}
                  extendEnds={extendEnds}
                  isPlayground={isPlayground}
                  isChoosing={cards.choosing}
                  isNewMenuOpen={isNewMenuOpen}
                  onNewMenuOpenChange={setIsNewMenuOpen}
                  onDone={isBeside ? undefined : onDone}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <MapCreditsSheet credits={credits} />
      <AccountDialogs session={session} auth={auth} recovery={recovery} />
    </div>
  );
}
