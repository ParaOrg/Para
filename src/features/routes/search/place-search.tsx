import type { ReactNode } from 'react';

import { TextField } from '@/design-system/primitives/text-field';
import type { LngLat } from '@/shared/utils/geo';

import { PlaceSearchResults, resultId } from './place-search-results';
import { RoutesNearHere } from './routes-near-here';
import type { LoadLandmarks } from './use-landmarks';
import { usePlaceSearch } from './use-place-search';
import type { Hotspot } from '../model/hotspots';
import type { HintuanNearHere } from '../model/landmark-search';
import type { SearchPlace } from '../model/place-search';
import type { Direction } from '../model/routes';
import type { Landmark } from '../published/landmark-file-schema';

interface PlaceSearchProps {
  hotspots: readonly Hotspot[];
  /** The directions that stop at a hotspot: what rides from a place, and its routes near a landmark. */
  directionsAt: (hotspotId: string) => readonly Direction[];
  /**
   * Where the commuter is now, when location is on, read as they type (the page keeps the fix in a
   * ref so a fix renders nothing): equal matches list nearest first.
   */
  whereNow?: () => LngLat | null;
  /** A Para place or a hintuan near a landmark chosen: the box to open, as a tap on it does. */
  onPick: (hotspot: Hotspot) => void;
  /** A landmark chosen: the camera to its point. */
  onLookAt: (point: LngLat) => void;
  /**
   * A landmark chosen, after the camera: given, it is the caller's (the studio marks the point);
   * left out, the Para routes near it are listed under the field (decision 8).
   */
  onPickLandmark?: (landmark: Landmark) => void;
  /**
   * The search starts over: something typed, or Escape with nothing typed. What a pick left behind
   * goes then, as the routes near a landmark do; the studio takes its dot away.
   */
  onSearchRestart?: () => void;
  /**
   * "Go here" on a hintuan near a landmark (ticket 07): the landmark, every hintuan near it and the
   * one chosen, for the trip there. Left out, the panel has no "Go here" (the studio's).
   */
  onGoHere?: (landmark: Landmark, near: readonly HintuanNearHere[], hintuan: Hotspot) => void;
  /** A word after a place's label, or null: the studio marks a new place still in a draft. */
  noteOf?: (place: SearchPlace) => string | null;
  /** Where the landmarks come from: the file unless given (stories). */
  loadLandmarks?: LoadLandmarks;
  /**
   * What marks a landmark on the map while its routes near here are open: the public map's pin
   * (ticket 06). Gone once the search is cleared, another result picked or the panel closed.
   */
  renderLandmarkPin?: (landmark: Landmark) => ReactNode;
  /** Under the results, from what is typed: the studio's routes and places to take down. */
  renderAfterResults?: (query: string) => ReactNode;
}

const NOWHERE = () => null;

/**
 * Place search (.scratch/place-search): a field, and under it Para's places the text matches,
 * then OpenStreetMap landmarks, read on the first keystroke. A combobox: the arrows move through
 * the results, Enter opens the one on, Escape empties the field. A place opens as a tap on the
 * map does; a landmark takes the camera there and lists the Para routes near it.
 */
export function PlaceSearch({
  hotspots,
  directionsAt,
  whereNow = NOWHERE,
  onPick,
  onLookAt,
  onPickLandmark,
  onSearchRestart,
  onGoHere,
  noteOf,
  loadLandmarks,
  renderLandmarkPin,
  renderAfterResults,
}: PlaceSearchProps) {
  const search = usePlaceSearch({
    hotspots,
    directionsAt,
    whereNow,
    onPick,
    onLookAt,
    onPickLandmark,
    onSearchRestart,
    onGoHere,
    noteOf,
    loadLandmarks,
  });
  const { listId, query, rows, landmarks, landmark, near, isOpen, hasList, activeIndex } = search;
  const hasActive = activeIndex >= 0;

  return (
    <div role="search" className="flex flex-col gap-2">
      <TextField
        label="Search places"
        value={query}
        onChange={(event) => search.handleQueryChange(event.target.value)}
        onClear={() => search.handleQueryChange('')}
        onKeyDown={search.handleKeyDown}
        role="combobox"
        aria-expanded={hasList}
        aria-controls={hasList ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={hasActive ? resultId(listId, activeIndex) : undefined}
        autoComplete="off"
        enterKeyHint="search"
        spellCheck={false}
      />
      {isOpen && (hasList || landmarks.state.status !== 'ready') && (
        <PlaceSearchResults
          id={listId}
          rows={rows}
          activeIndex={activeIndex}
          landmarks={landmarks.state}
          onPick={search.handlePick}
          onRetry={landmarks.retry}
        />
      )}
      {!isOpen && landmark && renderLandmarkPin?.(landmark)}
      {!isOpen && landmark && (
        <RoutesNearHere
          landmark={landmark}
          near={near}
          directionsAt={directionsAt}
          onPick={search.handlePickHintuan}
          onGoHere={search.handleGoHere}
          onClose={search.closeLandmark}
        />
      )}
      {search.emptyMessage && (
        <p className="rounded-xl bg-surface px-4 py-3 text-sm text-content-secondary shadow-large">
          {search.emptyMessage}
        </p>
      )}
      {renderAfterResults?.(query)}
      {/*
        Mounted for as long as the search is, so a screen reader hears its text change; a live
        region inserted with its text already in is often not read at all.
      */}
      <p role="status" className="sr-only">
        {search.announcement}
      </p>
    </div>
  );
}
