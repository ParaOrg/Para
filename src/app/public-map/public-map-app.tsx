import type { MapLibreMap } from 'maplibre-gl';
import { Suspense, useRef, useState } from 'react';

import { CommuterLocation, useGazeHush, type LocatorNote } from '@/features/locator';
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
import { RouteCardList } from '@/features/routes/cards/route-card-list';
import { TripCard } from '@/features/routes/cards/trip-card';
import { useBackClosesCards } from '@/features/routes/cards/use-back-closes-cards';
import { useTripTimeline } from '@/features/routes/cards/use-trip-timeline';
import { EndTitles } from '@/features/routes/map/end-titles';
import { HintuanPin } from '@/features/routes/map/hintuan-pin';
import { LandmarkPin } from '@/features/routes/map/landmark-pin';
import { lookAt } from '@/features/routes/map/look-at';
import { MapCreditsDock } from '@/features/routes/map/map-credits-dock';
import { MapCreditsSheet } from '@/features/routes/map/map-credits-sheet';
import { METRO_MANILA, MapView } from '@/features/routes/map/map-view';
import { openOnRoutes } from '@/features/routes/map/open-on-routes';
import { StationLabels } from '@/features/routes/map/station-labels';
import { useCardCamera } from '@/features/routes/map/use-card-camera';
import { useCardStack } from '@/features/routes/map/use-card-stack';
import { useEmptyMapTap } from '@/features/routes/map/use-empty-map-tap';
import { useFootbridges } from '@/features/routes/map/use-footbridges';
import { useLitRides } from '@/features/routes/map/use-lit-rides';
import { useLoopTip } from '@/features/routes/map/use-loop-tip';
import { useMapCredits } from '@/features/routes/map/use-map-credits';
import { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import { directionsAtHotspots } from '@/features/routes/model/directions-at';
import type { CommuterWhere } from '@/features/routes/model/loop-tip';
import { placeKey } from '@/features/routes/model/places';
import {
  loadDirectionsFromFile,
  loadHotspotsFromFile,
} from '@/features/routes/published/fetch-index';
import { fetchLine } from '@/features/routes/published/fetch-line';
import { isHotspotTapOn, isPlaceSearchShown, isRidePickingOn } from '@/shared/config/env';
import { useTurn } from '@/shared/hooks/commit-turn';
import { retryingLazy } from '@/shared/lib/retrying-lazy';
import { cn } from '@/shared/utils/cn';
import { retryingImport } from '@/shared/utils/retrying-import';

import { MapSheetControls } from './map-sheet-controls';
import type { SaidNote } from './page-toasts';
import { sheetTopUnderSearch } from './sheet-top-under-search';
import { useStatusBarColour } from './status-bar';

// The toasts, fetched the first time the page has something to say: the opening page does not
// carry them. Precached, so they come offline too; a fetch that fails all the same never blanks
// the page, and is asked for again (retryingLazy).
const PageToasts = retryingLazy(() =>
  retryingImport(() => import('./page-toasts'))().then((module) => module.PageToasts),
);

// Place search, fetched only where it is shown (isPlaceSearchShown): a build with it off never
// asks for it, and one with it on draws the bar a beat after the map. Precached, as the toasts.
const PlaceSearchBar = retryingLazy(() =>
  retryingImport(() => import('./place-search-bar'))().then((module) => module.PlaceSearchBar),
);

/**
 * The hotspots on the commuter map, the owner's calls for now: no pins zoomed in, no dots zoomed
 * out, and no tap unless isHotspotTapOn, a tap on a box then the route's or the empty map's; the
 * boxes and names still say where each one is. The studio keeps its pins, dots and taps.
 */
const HOTSPOT_MARKS = { shouldShowPins: false, dotKinds: [], isTappable: isHotspotTapOn } as const;

/**
 * While a place's card stands docked at full height, the toast sits 12 under its ✕ (map strip 24,
 * handle 18, ✕ 40), so the ✕ stays in reach; a trip has no ✕, and a floating card none there.
 */
const TOAST_UNDER_FULL_CARD =
  '@max-float:group-has-[[data-testid=card][data-snap=full]:not([hidden]):not(:has([data-testid=trip]))]/map:[--toast-top:calc(env(safe-area-inset-top)+--spacing(23.5))]';

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
  const tipId = useLoopTip(saved.selected, hotspots, { where, openedFrom: hotspots.selected });
  const handleWhere = (at: CommuterWhere | null) => {
    where.current = at;
  };

  // The route list, a hotspot's card and the trip opened from either: which
  // is up, what stands behind what, their height and colours (useCardStack).
  const cards = useCardStack(map, saved, hotspots);
  // The camera with the cards: a hintuan picked on the trip, gliding there;
  // a trip, a picked RouteCard and SWITCH taken in whole, again as the sheet
  // settles; the camera from before a hotspot's card was picked, back as it
  // is let go (useCardCamera).
  const {
    root,
    tripDock,
    hotspotDock,
    ride,
    clearOfOpen,
    switchTrip,
    flipList,
    filterList,
    otherRoute,
    openPlace,
    openTripFromPlace,
    goHere,
    letGoalGo,
    goalLandmark,
    walk,
    openTrip,
    backFromTrip,
    pickOnTrip,
    endOnTrip,
    overviewButton,
  } = useCardCamera(map, saved, hotspots, cards, { tipId });
  // What the lit routes wear on the map, their ends named (useLitRides): a
  // picked hintuan's ride flowing only as far as there.
  const { ridden, startId } = ride;
  const rides = useLitRides(map, saved, hotspots.hotspots, null, ridden, startId, tipId, true);

  // The commuter's own position, the dot and the camera with them live in
  // CommuterLocation, so a fix, the phone's compass and the dot's moods
  // render it alone. Its camera moves here, at this page's turn: after the
  // cards' camera above, which a sheet set to another height moves in the
  // same commit (commit-turn.ts).
  const locatorTurn = useTurn();
  // The dot's gaze is hushed by going back: it picks nothing (dot-gaze.ts).
  const { hush, hushedAt } = useGazeHush();
  useBackClosesCards(saved, hotspots, cards, backFromTrip, hush);
  // The empty map tapped, Escape or a pull down: the trip's ‹, which it no longer draws.
  const leaveTrip = hush(backFromTrip) ?? cards.closeAll;
  useEmptyMapTap(map, saved.selected ? leaveTrip : null);
  const offline = useOffline();
  // The phone's status bar in the map's colour (status-bar.ts).
  useStatusBarColour(map);
  // The footbridges from street level in, fetched the first time it is reached (.scratch/footbridges).
  useFootbridges(map);
  const age = useMapAge(saved.directions);
  const needRefresh = useNeedRefresh();
  // The install prompt, once the routes are on the map (useInstallPrompt).
  const install = useInstallPrompt(saved.directions.length > 0);

  const { tripLivery, litLivery, height } = cards;

  // The open trip's hintuans, worked out once per trip (useTripTimeline).
  const timeline = useTripTimeline(saved.selected, hotspots, tipId);

  // The map's credits, the Map Data Source sheet, opened by the ⓘ: the map and the cards under it
  // are out of reach while it is open.
  const credits = useMapCredits(root);

  return (
    // `data-directions`, `data-hotspot-taps` and `data-place-search`: how many the index brought,
    // whether a box takes a tap (isHotspotTapOn) and whether search is shown (isPlaceSearchShown),
    // for the suites on a production build, the map out of their reach.
    // `data-dock-host`: the open card's sheet says where its top is here
    // at rest, and on what follows it (`data-dock-follower`, the LocatorButton,
    // the map's ⓘ) as a finger drags it (BottomSheet). While "Update Para!"
    // waits, a toast sits 12 under it rather than over it: the button's 24
    // from the top and its 40 tall (Notices), `--toast-top` (ToastHost).
    <div
      ref={root}
      data-dock-host
      data-directions={saved.directions.length}
      data-hotspot-taps={isHotspotTapOn ? 'on' : 'off'}
      data-place-search={isPlaceSearchShown ? 'on' : 'off'}
      className={cn(
        'group/map @container relative h-full w-full overflow-clip',
        needRefresh && '[--toast-top:calc(env(safe-area-inset-top)+--spacing(19))]',
        cards.open && '[--dock-gap:1rem]', // 16 over a sheet: the controls, locate-me (4831:54489)
        sheetTopUnderSearch(needRefresh, offline || age.stale),
      )}
    >
      {/* The page's one h1, for a screen reader to move to by heading; nothing is drawn. */}
      <h1 className="sr-only">Para</h1>
      {/* Out of reach under the credits, the map and every card alike. */}
      <div inert={credits.state === 'open'} className="contents">
        {/*
        No count of routes and hotspots in a corner, and no +, − or compass:
        the owner leaves them off as clutter for commuters.
      */}
        {/*
        Opened framed on the routes, and handed over to draw them as soon as
        its style is in (`openOn`). MapLibre's corner credits step aside: the
        map's own ⓘ (MapCreditsDock) opens them as the Map Data Source sheet,
        always a tap away, as the licences need.
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
        <MapSheetControls
          map={map}
          overview={overviewButton}
          list={cards.choosing && !saved.selected && !cards.tripBehind ? saved : null}
          onFlip={flipList}
          onFilter={filterList}
        />
        {/*
        The commuter's own position, and the camera with them, kept clear of
        the card on show; the dot gazes at what was just picked.
      */}
        <CommuterLocation
          map={map}
          isMapLoaded={isMapLoaded}
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
          onWhere={handleWhere}
          onNote={handleLocatorNote}
        />
        {/*
        Each lit ride's ends, named over their circles; with no trip open, a
        tail opens its ride's.
      */}
        {map && <EndTitles map={map} rides={rides} livery={litLivery} onPick={openPlace} />}
        {/*
        The open trip's hintuans along its line, a train's stations and a
        jeepney's hintuans alike, each named (RouteLineLabel). Where picking is
        on (isRidePickingOn), a tap picks one as its row on the trip card does,
        the map gliding in to it, as the studio's do.
      */}
        {map && saved.selected && tripLivery && timeline && (
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
            onPick={isRidePickingOn ? pickOnTrip : undefined}
          />
        )}
        {/*
        Keyed on the pick: another hintuan pops a fresh circle. Its name,
        tapped, lets the pick go and takes the camera back where it was, as
        its row tapped again does.
      */}
        {map && ride.pinAt && tripLivery && (
          <HintuanPin
            key={ride.pickedId}
            map={map}
            at={ride.pinAt}
            label={ride.pickedLabel}
            code={ride.pickedCode}
            livery={tripLivery}
            onPick={isRidePickingOn ? () => ride.pick(ride.pickedId) : undefined}
          />
        )}
        {/* The ride's start, picked by Set as start: its own circle, Start's pill beside it. */}
        {map && ride.startPinAt && tripLivery && (
          <HintuanPin
            key={`start:${ride.startId}`}
            map={map}
            at={ride.startPinAt}
            label={ride.startLabel}
            code={ride.startCode}
            livery={tripLivery}
            marks="start"
            onPick={ride.removeStart}
          />
        )}

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
              directionsAt={directionsAtHotspots(saved.directions, hotspots.linkedDirectionIds)}
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
        <Notices offline={offline} age={age} needRefresh={needRefresh} onUpdate={reloadToUpdate} />
        {/* What went wrong, at the top: the locator's note and a failed load. */}
        {hasToasts && (
          <div className={cn('contents', TOAST_UNDER_FULL_CARD)}>
            <Suspense fallback={null}>
              <PageToasts locatorNote={locatorNote} load={loadToast} />
            </Suspense>
          </div>
        )}
        {/* Held while the credits are open: one dialog at a time. */}
        {install.shouldShow && credits.state === 'shut' && (
          <InstallPrompt onInstall={install.install} onLater={install.postpone} />
        )}
        {saved.selected && tripLivery && timeline && (
          <TripCard
            direction={saved.selected}
            directions={saved.directions}
            timeline={timeline}
            livery={tripLivery}
            onSwitch={switchTrip}
            onClose={leaveTrip}
            picked={ride.pickedId}
            // The pesos to a picked hintuan: the full line's, none while only its overview is here.
            pickedMetres={saved.fullIds.has(saved.selected.id) ? ride.rideTo?.metres : undefined}
            pickedCode={ride.pickedCode}
            start={ride.startId}
            startCode={ride.startCode}
            onSetStart={isRidePickingOn ? ride.setStart : undefined}
            onRemoveStart={isRidePickingOn ? ride.removeStart : undefined}
            walk={walk}
            onPick={isRidePickingOn ? pickOnTrip : undefined}
            onEnd={isRidePickingOn ? endOnTrip : undefined}
            endPicked={ride.endPicked}
            dockRef={tripDock}
            height={height}
            // "Other routes": that route's trip in this one's place, leaving to what this one was
            // picked from; the camera takes it in, the sheet stays where it is.
            onOtherRoute={otherRoute}
          />
        )}
        {/*
        A hotspot's card: HintuanCard (Figma 3854:12690), its boxes, the Selected one's routes as
        RouteCards; hidden behind a trip picked from them, for the trip to go back to. `card` to
        the suites too, after the trip on purpose: their first `card` is then the trip.
      */}
        {hotspots.selected && (
          // Keyed by the place: another of its boxes — a row, or SWITCH moving
          // to it — keeps the card as it is, its way round with it.
          <HintuanCard
            key={placeKey(hotspots.selected)}
            routeCards={{
              onShown: saved.showCard,
              // The other way round, the camera kept where it is (HintuanCard's onSwitch).
              onSwitch: (box) => box && hotspots.select(box),
            }}
            hidden={!!saved.selected}
            height={height}
            dockRef={hotspotDock}
            hotspot={hotspots.selected}
            hotspots={hotspots.hotspots}
            linkedDirectionIds={hotspots.linkedDirectionIds}
            directions={saved.directions}
            onSelectDirection={openTripFromPlace}
            // Its Selected row tapped again: no box is the one until a row is picked.
            deselected={hotspots.letGone}
            onDeselect={() => {
              saved.highlightCard(null);
              hotspots.letGo();
            }}
            // Another box: the map goes there, the box clear of the card, which keeps its height.
            onPickBox={(id) => {
              saved.highlightCard(null);
              hotspots.show(id, cards.clearOf(hotspotDock));
            }}
            onBack={hush(cards.backToTrip)}
            onClose={hush(cards.closeHotspot)}
          />
        )}
        {/*
        Several things under the tap: the route list, kept hidden behind the trip picked from it,
        whole, for the trip to go back to; a hotspot's row opens its card in the list's place.
      */}
        {cards.choosing && (
          <RouteCardList
            key={cards.choice.map((c) => c.id).join()}
            hidden={!!saved.selected || cards.tripBehind}
            height={height}
            routes={saved.candidates}
            hotspots={hotspots.candidates}
            back={saved.back}
            listing={saved.listing}
            onFlip={flipList}
            modeFilter={{ filter: saved.modeFilter, onFilter: filterList }}
            onRoute={openTrip}
            onHotspot={(s) => cards.openHotspot(s.id)}
            onClose={cards.closeAll}
          />
        )}
      </div>
      <MapCreditsSheet credits={credits} />
    </div>
  );
}
