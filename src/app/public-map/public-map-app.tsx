import type { MapLibreMap } from 'maplibre-gl';
import { Suspense, useRef, useState } from 'react';

import {
  CommuterLocation,
  useGazeHush,
  type CommuterLocationHandle,
  type LocatorNote,
} from '@/features/locator';
import {
  InstallPrompt,
  loadProblemToast,
  loadProblems,
  reloadForNewerApp,
  reloadToUpdate,
  useNeedRefresh,
  useInstallPrompt,
  Notices,
  useMapAge,
  useOffline,
} from '@/features/published-map';
import { HintuanCard } from '@/features/routes/cards/hintuan-card';
import { ListFilter } from '@/features/routes/cards/list-filter';
import { TripCard } from '@/features/routes/cards/trip-card';
import { LandmarkPin } from '@/features/routes/map/landmark-pin';
import { lookAt } from '@/features/routes/map/look-at';
import { MapCreditsDock } from '@/features/routes/map/map-credits-dock';
import { MapCreditsSheet } from '@/features/routes/map/map-credits-sheet';
import { METRO_MANILA, MapView } from '@/features/routes/map/map-view';
import { openOnRoutes } from '@/features/routes/map/open-on-routes';
import { RouteCards } from '@/features/routes/map/route-cards';
import { useFootbridges } from '@/features/routes/map/use-footbridges';
import { useMapCredits } from '@/features/routes/map/use-map-credits';
import { useRouteCards } from '@/features/routes/map/use-route-cards';
import { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import { directionsAtHotspots } from '@/features/routes/model/directions-at';
import type { CommuterWhere } from '@/features/routes/model/loop-tip';
import {
  loadDirectionsFromFile,
  loadHotspotsFromFile,
} from '@/features/routes/published/fetch-index';
import { fetchLine } from '@/features/routes/published/fetch-line';
import { isHotspotTapOn, isPlaceSearchShown, isRidePickingOn } from '@/shared/config/env';
import { useTurn } from '@/shared/hooks/commit-turn';
import { cn } from '@/shared/utils/cn';

import { DonationCard } from './donation-card';
import { ExploreCards, PageToasts, PlaceSearchBar } from './lazy-parts';
import { MapViewCorner } from './map-view-corner';
import type { SaidNote } from './page-toasts';
import { sheetTopUnderSearch } from './sheet-top-under-search';
import { useStatusBarColour } from './status-bar';
import { TOAST_UNDER_FULL_CARD, TOAST_UNDER_FULL_TRIP } from './toast-under-full';
import type { ExploreRest } from './use-explore-sheet';

/**
 * The hotspots on the commuter map, the owner's calls for now: no pins zoomed in, no dots zoomed
 * out, and no tap unless isHotspotTapOn, a tap on a box then the route's or the empty map's; the
 * boxes and names still say where each one is. The studio keeps its pins, dots and taps.
 */
const HOTSPOT_MARKS = { shouldShowPins: false, dotKinds: [], isTappable: isHotspotTapOn } as const;

/** The ⓘ hides at full height on a phone, no map to credit and the card under it, until lowered. */
const CREDITS_HIDDEN_AT_FULL =
  '@max-float:group-has-[:is([data-testid=card],[data-testid=chooser])[data-snap=full]:not([hidden])]/map:hidden';

/** The too-new map's Reload: the newer app, through the worker (pwa.ts). */
const handleReloadNewer = () => void reloadForNewerApp();

/**
 * The public map at /. Everything published so far and a card for whatever is
 * tapped — nothing else. No sign-in, no drawing, no database: the map comes
 * from the published map (an index and its line files), and this page's
 * bundle carries neither editor code nor a Supabase client
 * (scripts/checks/check-build.mjs proves both).
 *
 * On a phone the tap is the whole interface: the cards are bottom sheets, a
 * tap near a line counts, and a tap where routes share a road offers a choice.
 */
export function PublicMapApp() {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  // Its 'load' in and not failed: the map-style button waits for it (LocationAndMapControl).
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  // One index, fetched once, shared by both hooks; a direction's full line
  // read as it is lit (fetch-line.ts).
  const saved = useSavedRoutes(map, loadDirectionsFromFile, { loadLine: fetchLine });
  // While a trip is open, the map lights only the trip.
  const hotspots = useSavedHotspots(map, loadHotspotsFromFile, {
    muted: !!saved.selected,
    ...HOTSPOT_MARKS,
  });
  // A load problem, and a published map too new for this app (loadProblems).
  const problems = loadProblems([saved, hotspots]);
  // Each Try again answered: one that fails again says so again, after its toast closed.
  const [loadTries, setLoadTries] = useState(0);
  const handleTryAgain = () => {
    void problems.tryAgain().then(() => setLoadTries((n) => n + 1));
  };
  // What the locator has to say, and how many times it has said it (Locator's onNote).
  const [locatorNote, setLocatorNote] = useState<SaidNote | null>(null);
  const handleLocatorNote = (note: LocatorNote | null) => {
    setLocatorNote((last) => note && { note, saying: (last?.saying ?? 0) + 1 });
  };
  // The toasts' code comes with the first of them, and stays.
  const [hasToasts, setHasToasts] = useState(false);
  const loadToast = loadProblemToast(problems, {
    tries: loadTries,
    onTryAgain: handleTryAgain,
    onReloadNewer: handleReloadNewer,
  });
  if ((locatorNote || loadToast) && !hasToasts) setHasToasts(true);

  // Where the commuter is, as CommuterLocation tells it (the first fix, then
  // each 50 m), kept in memory only, for the tip of a loop's trip: where its
  // timeline leaves from, chosen once as the trip opens (useLoopTip). A ref,
  // not state: a fix renders nothing, and only the trip's opening reads it.
  const where = useRef<CommuterWhere | null>(null);
  const handleWhere = (at: CommuterWhere | null) => {
    where.current = at;
  };
  // The dot's gaze is hushed by going back: it picks nothing (dot-gaze.ts).
  const { hush, hushedAt } = useGazeHush();

  // The route list, a hotspot's card and the trip opened from either, the camera with them and
  // what the lit routes wear (useRouteCards); RouteCards draws them.
  const routeCards = useRouteCards(map, saved, hotspots, { hush, where, isRidePickingOn });
  const { cards, camera, listUp, floats } = routeCards;
  const { root, ride, clearOfOpen, openPlace, goHere, letGoalGo, goalLandmark } = camera;
  const [exploreRest, setExploreRest] = useState<ExploreRest>('open'); // Whole, then Low once a card opened.
  if (cards.open && exploreRest === 'open') setExploreRest('low'); // Back from a card: Low (the owner).

  // The commuter's own position, the dot and the camera with them live in CommuterLocation, so a
  // fix, the phone's compass and the dot's moods render it alone. Its camera moves here, at this
  // page's turn: after the cards' camera above, which a sheet set to another height moves in the
  // same commit (commit-turn.ts).
  const locatorTurn = useTurn();
  const locator = useRef<CommuterLocationHandle>(null); // For "Turn on location" (ExploreCards).
  const offline = useOffline();
  // The phone's status bar in the map's colour (status-bar.ts).
  useStatusBarColour(map);
  // The footbridges from street level in, fetched the first time it is reached (.scratch/footbridges).
  useFootbridges(map);
  const age = useMapAge(saved.directions);
  const needRefresh = useNeedRefresh();
  // The install prompt, once the routes are on the map (useInstallPrompt).
  const install = useInstallPrompt(saved.directions.length > 0);

  // The map's credits, the Map Data Source sheet, opened by the ⓘ: the map and the cards under it
  // are out of reach while it is open.
  const credits = useMapCredits(root);

  return (
    // `data-directions`, `data-hotspot-taps`, `data-place-search`: for the suites on a production
    // build (the index's count; isHotspotTapOn; isPlaceSearchShown). `data-scale-under-credits`:
    // the map's scale bar under the ⓘ, over the sheets (map-frame.css). `data-dock-host`: the open
    // card's sheet says where its top is here, and on what follows it (`data-dock-follower`) as a
    // finger drags it (BottomSheet). While "Update Para!" waits, a toast sits 12 under it (Notices,
    // `--toast-top`, ToastHost).
    <div
      ref={root}
      data-dock-host
      data-scale-under-credits
      data-directions={saved.directions.length}
      data-hotspot-taps={isHotspotTapOn ? 'on' : 'off'}
      data-place-search={isPlaceSearchShown ? 'on' : 'off'}
      className={cn(
        'group/map @container relative h-full w-full overflow-clip',
        needRefresh && '[--toast-top:calc(env(safe-area-inset-top)+--spacing(19))]',
        // 16 over a sheet or the explore cards, 16 in, 16 up floating: controls, locate-me (4885:44805)
        '[--dock-float-bottom:1rem] [--dock-gap:1rem] [--dock-right:1rem]',
        sheetTopUnderSearch(needRefresh, offline || age.stale),
      )}
    >
      {/* The page's one h1, for a screen reader to move to by heading; nothing is drawn. */}
      <h1 className="sr-only">Para</h1>
      {/* Out of reach under the credits, the map and every card alike. */}
      <div inert={credits.state === 'open'} className="contents">
        {/*
        No count of routes and hotspots, no +, − or compass: clutter for commuters (the owner).
        Opened framed on the routes, drawn once its style is in (`openOn`). MapLibre's corner
        credits step aside: the map's ⓘ (MapCreditsDock) opens them as the Map Data Source sheet.
      */}
        <MapView
          onReady={setMap}
          onLoadedChange={setIsMapLoaded}
          zoomButtons={false}
          maxBounds={METRO_MANILA}
          openOn={openOnRoutes}
          areCreditsShown={credits.isSheetMissing}
          hasMapStyleButton={false}
        />
        {!credits.isSheetMissing && (
          <div className={cn('contents', CREDITS_HIDDEN_AT_FULL)}>
            <MapCreditsDock
              isDocked={cards.open}
              corner="top-left"
              onOpen={credits.open}
              buttonRef={credits.buttonRef}
            />
          </div>
        )}
        <MapViewCorner map={map} isMapLoaded={isMapLoaded} />
        <RouteCards
          map={map}
          saved={saved}
          hotspots={hotspots}
          routeCards={routeCards}
          besideControls={
            // The commuter's position and the camera with them, clear of the card; the dot's gaze.
            <CommuterLocation
              ref={locator}
              map={map}
              isMapLoaded={isMapLoaded}
              snap={cards.snap}
              offset={clearOfOpen}
              docked={cards.open}
              hasMapStyle={false}
              above={
                listUp &&
                !floats && <ListFilter list={listUp} onFilter={camera.filterList} tooltip="right" />
              }
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
              onWhere={handleWhere}
              onNote={handleLocatorNote}
            />
          }
          underCards={
            <>
              {/* The landmark "Go here" made the goal: its pin stays while the goal holds (ticket 07). */}
              {map && goalLandmark && (
                <LandmarkPin key={goalLandmark.id} map={map} at={goalLandmark.point} />
              )}
              {/* Place search: a place opens as its name tapped does; wide, the cards float under it. */}
              {isPlaceSearchShown && (
                <Suspense fallback={null}>
                  <PlaceSearchBar
                    map={map}
                    hotspots={hotspots.hotspots}
                    directionsAt={directionsAtHotspots(
                      saved.directions,
                      hotspots.linkedDirectionIds,
                    )}
                    whereNow={() => where.current?.at ?? null}
                    onPick={(hotspot) => openPlace(hotspot.id)}
                    onLookAt={(point) => lookAt(map, point)}
                    onGoHere={(landmark, near, hintuan) => goHere(landmark, near, hintuan.id)}
                    onSearchRestart={letGoalGo}
                    isUnderUpdate={needRefresh}
                    isUnderOfflinePill={offline || age.stale}
                    isCardOpen={cards.open}
                  />
                </Suspense>
              )}
              {/* How old the map is, and a new version waiting. */}
              <Notices
                offline={offline}
                age={age}
                needRefresh={needRefresh}
                onUpdate={reloadToUpdate}
              />
              {/* What went wrong, at the top: the locator's note and a failed load. */}
              {hasToasts && (
                <div className={cn('contents', TOAST_UNDER_FULL_CARD, TOAST_UNDER_FULL_TRIP)}>
                  <Suspense fallback={null}>
                    <PageToasts locatorNote={locatorNote} load={loadToast} />
                  </Suspense>
                </div>
              )}
              {/* Held while the credits are open: one dialog at a time. */}
              {install.shouldShow && credits.state === 'shut' && (
                <InstallPrompt onInstall={install.install} onLater={install.postpone} />
              )}
            </>
          }
          renderTrip={(trip) => (
            <TripCard
              direction={trip.direction}
              directions={trip.directions}
              timeline={trip.timeline}
              livery={trip.livery}
              onSwitch={trip.switchTrip}
              onClose={trip.leaveTrip}
              picked={trip.ride.pickedId}
              pickedMetres={trip.pickedMetres}
              pickedCode={trip.ride.pickedCode}
              start={trip.ride.startId}
              startCode={trip.ride.startCode}
              onSetStart={trip.picking?.setStart}
              onRemoveStart={trip.picking?.removeStart}
              walk={trip.walk}
              onPick={trip.picking?.pick}
              onEnd={trip.picking?.end}
              endPicked={trip.ride.endPicked}
              dockRef={trip.tripDock}
              height={trip.height}
              onOtherRoute={trip.otherRoute}
            />
          )}
          // A hotspot's card: HintuanCard (Figma 3854:12690), its boxes, the Selected one's routes
          // as RouteCards; hidden behind a trip picked from them, for the trip to go back to.
          renderPlace={(place) => (
            <HintuanCard
              routeCards={{ onShown: place.showCard, onSwitch: place.switchBox }}
              hidden={place.isHidden}
              height={place.height}
              dockRef={place.hotspotDock}
              hotspot={place.hotspot}
              hotspots={place.hotspots}
              linkedDirectionIds={place.linkedDirectionIds}
              directions={place.directions}
              onSelectDirection={place.openTrip}
              deselected={place.isDeselected}
              onDeselect={place.deselect}
              onPickBox={place.pickBox}
              onBack={place.back}
              onClose={place.close}
            />
          )}
          listEnd={<DonationCard isListEnd />}
        />
        {/* With nothing open: ways to explore, and the donation card (Figma 4852:35066). */}
        {!cards.open && (
          <Suspense fallback={null}>
            <ExploreCards
              onLocate={() => locator.current?.locate()}
              startsAt={exploreRest}
              onRest={(snap) => cards.setIdleSnap(snap)}
            />
          </Suspense>
        )}
      </div>
      <MapCreditsSheet credits={credits} />
    </div>
  );
}
