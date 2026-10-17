import type { Session } from '@supabase/supabase-js';
import type { MapLibreMap } from 'maplibre-gl';
import { useRef, useState } from 'react';

import { RouteCardList } from '@/features/routes/cards/route-card-list';
import { EndTitles } from '@/features/routes/map/end-titles';
import { HintuanPin } from '@/features/routes/map/hintuan-pin';
import { MapView } from '@/features/routes/map/map-view';
import { StationLabels } from '@/features/routes/map/station-labels';
import { useCardCamera } from '@/features/routes/map/use-card-camera';
import { useCardStack } from '@/features/routes/map/use-card-stack';
import { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import { hotspotCount } from '@/features/routes/model/places';
import {
  lineOf,
  listDirections,
  loadHotspotsFromSupabase,
  getSupabase,
  supabaseConfigError,
  returnTripLeft,
  AuthDialogs,
  AccountPill,
  MapPlaceholder,
  MapSwitch,
  NewButtons,
  DrawToolbar,
  SaveToasts,
  STUDIO_BASEMAPS,
  STUDIO_BASEMAP_THUMBNAILS,
  StudioHotspotCard,
  StudioSaveSheets,
  StudioTripCard,
  type usePasswordRecovery,
  useAuthFlow,
  useDrawing,
  useFollow,
  useLoopClosing,
  useSaveFlow,
  useSaveTarget,
  useStudioMap,
  useDeleteActions,
  useStudioTrip,
} from '@/features/studio';

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
  const [hotspotMenu, setHotspotMenu] = useState(false);
  // Which of the three maps is shown. Only the Playground has tools: the others
  // stay behind the one map and its state, so a switch keeps the camera, the
  // basemap and a half-drawn line.
  const { studioMap, chooseStudioMap } = useStudioMap();
  const isPlayground = studioMap === 'playground';
  const switchRef = useRef<HTMLDivElement>(null);
  const handleOpenPlayground = () => {
    chooseStudioMap('playground');
    // The button that was pressed leaves with the placeholder; focus goes to the switch.
    switchRef.current?.querySelector<HTMLInputElement>('input[value="playground"]')?.focus();
  };
  // Sign-in, the password change and a reset link's (useAuthFlow).
  const {
    isSignedIn,
    isSigningIn,
    setIsSigningIn,
    isChangingPassword,
    setIsChangingPassword,
    isResetting,
  } = useAuthFlow(session, recovery);

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
  const { isSaving, setIsSaving, toast, setToast, setNotice, justSaved, onSaved, onSavedHotspot } =
    useSaveFlow({
      recoveryError: recovery.error,
      cancelDrawing: draw.cancel,
      reloadRoutes: saved.reload,
      reloadHotspots: hotspots.reload,
    });
  // The route list, a hotspot's card and the trip opened from either, as on
  // the public map (useCardStack).
  const cards = useCardStack(map, saved, hotspots);
  // The camera with the cards, as on the public map (useCardCamera), so the
  // studio has the public map's interaction. A hintuan picked on the trip
  // card, the camera gliding there clear of the card and a circle popping up
  // on it, the route left whole, the card staying at its height; a trip
  // opened on its whole route, a RouteCard picked, SWITCH and the sheet
  // settled at another height, each framed beside the card; and the camera
  // from before a hotspot's RouteCard was picked, back as it is let go.
  const {
    root,
    tripDock,
    ride,
    clearOfOpen,
    switchTrip,
    flipList,
    pickOnPlaceCard,
    openTrip,
    backFromTrip,
    pickOnTrip,
    endOnTrip,
  } = useCardCamera(map, saved, hotspots, cards);

  const { rides, timeline, routeCount } = useStudioTrip({
    map,
    saved,
    hotspots,
    hiddenDirectionId: draw.target.directionId,
    ride,
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
    if (!isSignedIn) setIsSigningIn(true);
    else setIsSaving(true);
  };

  const { choice, choosing, closeAll, tripLivery, litLivery, height } = cards;

  // "Draw the return trip" only while the route still has a way undrawn.
  const slotLeft = returnTripLeft(justSaved, saved.directions);

  // Delete on the trip's card and the hotspot's: signed out, it asks for sign-in.
  const { onDelete, onDeleteHotspot } = useDeleteActions({
    signedIn: isSignedIn,
    onSignInNeeded: () => setIsSigningIn(true),
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
      <div ref={root} data-map-box className="@container relative min-h-0 flex-1 overflow-clip">
        {/* Inert on the other maps, so a keyboard cannot pan the camera that waits there. */}
        <div inert={!isPlayground} className="contents">
          <MapView
            onReady={setMap}
            foldCredits
            basemaps={STUDIO_BASEMAPS}
            basemapThumbnails={STUDIO_BASEMAP_THUMBNAILS}
          />
        </div>

        {/* A config or load problem is a banner, never a blank page. */}
        {(supabaseConfigError || saved.error || hotspots.error) && (
          <div className="absolute top-[calc(1rem+var(--map-safe-top))] left-1/2 z-20 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-900 shadow ring-1 ring-amber-200">
            {supabaseConfigError ?? `Couldn't load saved routes: ${saved.error ?? hotspots.error}`}
          </div>
        )}

        {!isPlayground && (
          <MapPlaceholder
            map={studioMap}
            hasLine={draw.drawing}
            onOpenPlayground={handleOpenPlayground}
          />
        )}

        {/* Out of the page's reach, not unmounted, on the other maps. */}
        <div inert={!isPlayground} className={isPlayground ? 'contents' : 'hidden'}>
          {/* Each lit ride's ends, named over their circles. */}
          {map && !draw.drawing && <EndTitles map={map} rides={rides} livery={litLivery} />}
          {/*
        The open trip's hintuans along its line, a train's stations and a
        jeepney's alike, named (RouteLineLabel).
      */}
          {map && !draw.drawing && saved.selected && tripLivery && timeline && (
            <StationLabels
              map={map}
              selected={saved.selected}
              hotspots={hotspots.hotspots}
              rows={timeline.between}
              livery={tripLivery}
              pickedId={ride.pickedId}
              startId={ride.startId}
              endPicked={ride.endPicked}
              hasRide={ride.ridden !== null}
              onPick={pickOnTrip}
            />
          )}
          {/* Keyed on the pick: another hintuan pops a fresh circle. */}
          {map && !draw.drawing && ride.pinAt && tripLivery && (
            <HintuanPin
              key={ride.pickedId}
              map={map}
              at={ride.pinAt}
              label={ride.pickedLabel}
              code={ride.pickedCode}
              livery={tripLivery}
            />
          )}
          {map && !draw.drawing && ride.startPinAt && tripLivery && (
            <HintuanPin
              key={`start:${ride.startId}`}
              map={map}
              at={ride.startPinAt}
              label={ride.startLabel}
              code={ride.startCode}
              livery={tripLivery}
              marks="start"
            />
          )}

          {/*
        The tapped direction as the public map's trip card, the editor's facts
        and its Edit, Extend and Delete under its tiles. Keyed on the route,
        unlike the public map's: SWITCH keeps the card and its colour.
      */}
          {!draw.drawing && saved.selected && tripLivery && timeline && (
            <StudioTripCard
              key={saved.selected.routeId}
              direction={saved.selected}
              saved={saved}
              hotspots={hotspots}
              draw={draw}
              timeline={timeline}
              livery={tripLivery}
              ride={ride}
              tripDock={tripDock}
              height={height}
              canEdit={canEdit}
              opening={opening}
              onDelete={onDelete}
              onBackToList={backFromTrip}
              onSwitch={switchTrip}
              onClose={closeAll}
              onPick={pickOnTrip}
              onEnd={endOnTrip}
            />
          )}

          {/*
        A hotspot's card, its routes as RouteCards; it stays behind the trip
        picked from them, hidden, for the trip's ‹. After the trip on
        purpose, as on the public map: the suites' first `card` is the trip.
      */}
          {!draw.drawing && hotspots.selected && (
            <StudioHotspotCard
              key={hotspots.selected.id}
              hotspot={hotspots.selected}
              map={map}
              saved={saved}
              hotspots={hotspots}
              draw={draw}
              height={height}
              canEdit={canEdit}
              clearOfOpen={clearOfOpen}
              onPickOnPlaceCard={pickOnPlaceCard}
              onOpenTrip={openTrip}
              onDeleteHotspot={onDeleteHotspot}
              onCloseAll={closeAll}
              onClose={cards.closeHotspot}
            />
          )}

          {/*
        Several saved things under one click: the same list the public map
        has, kept hidden behind the trip picked from it. It lists only what is
        drawn, and the owner keeps it so.
      */}
          {!draw.drawing && choosing && (
            <RouteCardList
              key={choice.map((c) => c.id).join()}
              hidden={!!saved.selected}
              height={height}
              routes={saved.candidates}
              hotspots={hotspots.candidates}
              back={saved.back}
              onFlip={flipList}
              selected={saved.highlight?.where === 'list' ? saved.highlight.from : null}
              onSelect={(p) => saved.highlightCard(p && { where: 'list', ...p })}
              onRoute={openTrip}
              onHotspot={(s) => cards.openHotspot(s.id)}
              onClose={closeAll}
            />
          )}
          {!draw.drawing && !saved.selected && !hotspots.selected && !choosing && (
            <AccountPill
              routes={routeCount}
              hotspots={hotspots.hotspots.length > 0 ? hotspotCount(hotspots.hotspots) : 0}
              email={session ? (session.user.email ?? '') : null}
              onSignIn={() => setIsSigningIn(true)}
              onPassword={() => setIsChangingPassword(true)}
              onSignOut={() => void getSupabase()?.auth.signOut()}
            />
          )}

          <SaveToasts
            toast={toast}
            isDrawing={draw.drawing}
            canDrawReturnTrip={slotLeft}
            onDismiss={() => setToast(null)}
            onDrawReturnTrip={(routeId) => {
              setToast(null);
              startReturnTrip(routeId);
            }}
          />

          {draw.drawing ? (
            <DrawToolbar
              draw={draw}
              onDone={onDone}
              keys={
                isPlayground && !isSaving && !isSigningIn && !isChangingPassword && !isResetting
              }
              ends={extendEnds}
              loop={loop}
            />
          ) : choosing ? null : (
            /*
          Drawing needs no account; saving does, and asks for it at Done. Not
          while the route list is open, as the account pill is not: under
          1024 px wide the list docks along the bottom, and these would stand
          on its corner.
        */
            <NewButtons
              ready={!!map}
              menu={hotspotMenu}
              setMenu={setHotspotMenu}
              onNewRoute={() => draw.start()}
              onNewHotspot={(kind) => draw.startArea(kind)}
            />
          )}
        </div>
      </div>
      {/* Outside the map's box, so a full-screen panel covers the band too. */}
      <div inert={!isPlayground} className={isPlayground ? 'contents' : 'hidden'}>
        <AuthDialogs
          signingIn={isSigningIn && !isSignedIn}
          onSignInDismiss={() => setIsSigningIn(false)}
          resetting={isResetting}
          isInvite={recovery.isInvite}
          onResetDone={recovery.done}
          changingPasswordFor={
            isChangingPassword && !isResetting ? (session?.user.email ?? null) : null
          }
          onPasswordDone={() => setIsChangingPassword(false)}
        />

        <StudioSaveSheets
          isSaving={isSaving}
          draw={draw}
          saved={saved}
          hotspots={hotspots}
          target={target}
          onSaved={onSaved}
          onSavedHotspot={onSavedHotspot}
          onCancel={() => setIsSaving(false)}
        />
      </div>
    </div>
  );
}
