import { TextField } from '@/design-system/primitives/text-field';
import type { LngLat } from '@/shared/utils/geo';

import { PlaceSearchResults, resultId } from './place-search-results';
import { RoutesNearHere } from './routes-near-here';
import type { LoadLandmarks } from './use-landmarks';
import { usePlaceSearch } from './use-place-search';
import type { Hotspot } from '../model/hotspots';
import type { Direction } from '../model/routes';

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
  /** Where the landmarks come from: the file unless given (stories). */
  loadLandmarks?: LoadLandmarks;
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
  loadLandmarks,
}: PlaceSearchProps) {
  const search = usePlaceSearch({
    hotspots,
    directionsAt,
    whereNow,
    onPick,
    onLookAt,
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
      {!isOpen && landmark && (
        <RoutesNearHere
          landmark={landmark}
          near={near}
          directionsAt={directionsAt}
          onPick={search.handlePickHintuan}
          onClose={search.closeLandmark}
        />
      )}
      {search.emptyMessage && (
        <p className="rounded-xl bg-surface px-4 py-3 text-sm text-content-secondary shadow-large">
          {search.emptyMessage}
        </p>
      )}
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
