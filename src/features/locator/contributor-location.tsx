import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { BASEMAPS } from '@/features/routes/map/basemap';
import { BASEMAP_THUMBNAILS } from '@/features/routes/map/basemap-thumbnails';
import { coarse } from '@/features/routes/map/map-view';

import { keepLastKnown, readLastKnown, type LastKnown } from './last-known';
import { LastKnownDot } from './last-known-dot';
import { isLocationGranted } from './location-permission';
import { Locator } from './locator';
import { LOCATION_OFF_NOTE, type LocatorNote } from './locator-note';
import { LocatorOnMap } from './locator-on-map';
import { circleRadius, type Fix } from './locator-rules';
import { useLocator } from './use-locator';
import { useLocatorMood } from './use-locator-mood';

interface ContributorLocationProps {
  map: MapLibreMap | null;
  /** The map's 'load' is in and it has not failed (MapView's onLoadedChange). */
  isMapLoaded: boolean;
  /** A recording is on: the camera follows the contributor from its start. */
  isRecording: boolean;
  /** A ride's fitted sheet is on the map: the buttons stand on it, following it all the way up. */
  isDocked?: boolean;
  /** What stands above the button in its column; the contributor's mark button. */
  above?: ReactNode;
  /** What the locator has to say, for the page's problem toast; null once a fix comes (Locator). */
  onNote?: (note: LocatorNote | null) => void;
  /** Where the dot is, at each fix: its place and its accuracy ring's radius in metres. */
  onWhere?: (where: LocatorWhere | null) => void;
  /**
   * The contributor app's: whether the phone's location is on, asked as the button is tapped, with
   * Google's "Turn on location?" dialog when it is off. "off" says so in the page's toast, at each
   * tap, and nothing is asked of the browser; "unknown" taps as the web does. Without it (the
   * web), the button asks the browser.
   */
  checkLocationOn?: () => Promise<'on' | 'off' | 'unknown'>;
  /**
   * The contributor app's: where the phone last was stays on the map, greyed out with how long
   * ago, while location is off or no fix comes, and is kept on the phone for the next start.
   * Display only: it never becomes ride data. Without it (the web), the map shows only a live dot.
   */
  remembersLastPlace?: boolean;
}

/** A fix older than this is not where the phone is now: the last known place shows instead. */
const LIVE_FIX_MS = 30_000;
/** How often a live fix is kept on the phone: often enough, without a write a second. */
const KEEP_EVERY_MS = 15_000;
/** How often the last known place's clock is read again: its pill says minutes. */
const LAST_KNOWN_TICK_MS = 15_000;

/** Where the contributor's dot is drawn: the page's paused frost clears round it. */
export interface LocatorWhere {
  at: Fix['at'];
  ringM: number;
}

/**
 * Where the contributor sits from the map's centre: lifted clear of the bars
 * along the bottom, by half of what the page stands there (`--dock-foot`, as
 * Locator keeps its button clear of them), so they sit in the middle of what shows.
 */
function clearOfBars(): [number, number] {
  const foot = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--dock-foot'),
  );
  return [0, Number.isFinite(foot) ? -foot / 2 : 0];
}

/**
 * The public map's locator for the contributor's map: the button with the
 * map-style picker on it, and the dot with its moods and heading, without the
 * cards' sheet, gaze and loop tip.
 *
 * It starts by itself when the browser already allows the location, and
 * otherwise waits for a tap. When a recording starts it follows the
 * contributor if the camera is not already on them.
 */
export function ContributorLocation({
  map,
  isMapLoaded,
  isRecording,
  isDocked = false,
  above,
  onNote,
  onWhere,
  checkLocationOn,
  remembersLastPlace = false,
}: ContributorLocationProps) {
  const locator = useLocator(map, { compass: coarse, snap: 'low', offset: clearOfBars });
  const { mood, face, beat, poke } = useLocatorMood(locator);
  const { tap, status, camera, fix } = locator;

  // The dot's place and ring, for the page: told at each fix, and that there is none.
  useEffect(() => {
    onWhere?.(fix ? { at: fix.at, ringM: circleRadius(fix.accuracy) } : null);
  }, [fix, onWhere]);

  // The app's "Location is off" is out: the first fix takes it back, however the locator was
  // started (the button, a recording, the permission already granted), as a fix takes back the
  // browser's own notes (Locator).
  const isOffSaid = useRef(false);
  const latestOnNote = useRef(onNote);
  useEffect(() => {
    latestOnNote.current = onNote;
  });
  useEffect(() => {
    if (!fix || !isOffSaid.current) return;
    isOffSaid.current = false;
    latestOnNote.current?.(null);
  }, [fix]);

  // Where the phone last was: this run's last fix, kept even once the locator lets its fix go (a
  // permission taken back), else the place an earlier run kept.
  const [lastPlace, setLastPlace] = useState<LastKnown | null>(() =>
    remembersLastPlace ? readLastKnown() : null,
  );
  if (remembersLastPlace && fix && fix.time !== lastPlace?.time) {
    setLastPlace({ at: fix.at, time: fix.time });
  }
  // Each live fix kept on the phone, for the next start.
  const keptAt = useRef(0);
  useEffect(() => {
    if (!remembersLastPlace || !fix || fix.time - keptAt.current < KEEP_EVERY_MS) return;
    keptAt.current = fix.time;
    keepLastKnown({ at: fix.at, time: fix.time });
  }, [fix, remembersLastPlace]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!remembersLastPlace) return;
    const timer = window.setInterval(() => setNow(Date.now()), LAST_KNOWN_TICK_MS);
    return () => window.clearInterval(timer);
  }, [remembersLastPlace]);
  const isFixLive = !!fix && (!remembersLastPlace || now - fix.time < LIVE_FIX_MS);

  // The latest tap, for effects that must not re-run when the hook hands out a new one.
  const latestTap = useRef(tap);
  useEffect(() => {
    latestTap.current = tap;
  });

  // Permission already granted: start as if tapped once, when the map is there.
  useEffect(() => {
    if (!map) return;
    let isCancelled = false;
    void isLocationGranted().then((isGranted) => {
      if (isGranted && !isCancelled) latestTap.current();
    });
    return () => {
      isCancelled = true;
    };
  }, [map]);

  // A recording starts: follow the contributor, unless the camera is on them already.
  const wasRecording = useRef(isRecording);
  useEffect(() => {
    const hasStarted = isRecording && !wasRecording.current;
    wasRecording.current = isRecording;
    if (!hasStarted) return;
    const isRefused = status === 'denied' || status === 'unavailable';
    if (!isRefused && camera !== 'tracked' && camera !== 'compass') latestTap.current();
  }, [isRecording, status, camera]);

  // The button's tap, in the app: location turned on first, or a word that it is off. A browser
  // gives no refusal while the phone's location is off, only a wait of 20 s with nothing said.
  const handleTap = () => {
    if (!checkLocationOn) {
      tap();
      return;
    }
    void checkLocationOn().then((setting) => {
      if (setting === 'off') {
        isOffSaid.current = true;
        latestOnNote.current?.(LOCATION_OFF_NOTE);
        return;
      }
      latestTap.current();
    });
  };

  return (
    <>
      {map && (
        <Locator
          locator={checkLocationOn ? { ...locator, tap: handleTap } : locator}
          map={map}
          isMapLoaded={isMapLoaded}
          basemaps={BASEMAPS}
          basemapThumbnails={BASEMAP_THUMBNAILS}
          labelsPlace="map"
          docked={isDocked}
          dockCap="top"
          above={above}
          onNote={onNote}
        />
      )}
      {map && !isFixLive && lastPlace && <LastKnownDot map={map} place={lastPlace} now={now} />}
      {map && locator.fix && isFixLive && (
        <LocatorOnMap
          map={map}
          fix={locator.fix}
          heading={locator.heading}
          mood={mood}
          face={face}
          beat={beat}
          onPoke={poke}
        />
      )}
    </>
  );
}
