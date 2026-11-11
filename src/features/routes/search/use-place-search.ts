import { useId, useState, type KeyboardEvent } from 'react';

import type { LngLat } from '@/shared/utils/geo';

import { resultId } from './place-search-results';
import { announce } from './search-announcement';
import type { SearchRow } from './search-rows';
import { useLandmarks, type LoadLandmarks } from './use-landmarks';
import { useSearchRows } from './use-search-rows';
import type { Hotspot } from '../model/hotspots';
import { routesNearHere, type HintuanNearHere } from '../model/landmark-search';
import type { PlaceMatch, SearchPlace } from '../model/place-search';
import type { Direction } from '../model/routes';
import type { Landmark } from '../published/landmark-file-schema';

export interface PlaceSearchInputs {
  hotspots: readonly Hotspot[];
  directionsAt: (hotspotId: string) => readonly Direction[];
  whereNow: () => LngLat | null;
  onPick: (hotspot: Hotspot) => void;
  onLookAt: (point: LngLat) => void;
  onPickLandmark?: (landmark: Landmark) => void;
  onSearchRestart?: () => void;
  onGoHere?: (landmark: Landmark, near: readonly HintuanNearHere[], hintuan: Hotspot) => void;
  noteOf?: (place: SearchPlace) => string | null;
  loadLandmarks?: LoadLandmarks;
}

const NO_NOTE = () => null;

/** The box a place opens by, as a tap on its name would: its terminal, else its first box. */
function boxToOpen(match: PlaceMatch): Hotspot {
  const { hotspots } = match.place;
  return hotspots.find((h) => h.kind === 'terminal') ?? hotspots[0];
}

/**
 * Place search's state and keys (PlaceSearch draws them): what is typed, the row the arrows are
 * on, the rows, the landmarks as they load, and the landmark whose routes near here are open.
 */
export function usePlaceSearch({
  hotspots,
  directionsAt,
  whereNow,
  onPick,
  onLookAt,
  onPickLandmark,
  onSearchRestart,
  onGoHere,
  noteOf = NO_NOTE,
  loadLandmarks,
}: PlaceSearchInputs) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  // Where the commuter was at the last keystroke: read in the handler, never during render.
  const [from, setFrom] = useState<LngLat | null>(null);
  // The landmark whose routes near here are open, after it was chosen.
  const [landmark, setLandmark] = useState<Landmark | null>(null);
  const landmarks = useLandmarks(loadLandmarks);
  const rows = useSearchRows(query, hotspots, landmarks.state, from, directionsAt, noteOf);
  const isOpen = query.trim() !== '';
  const hasActive = activeIndex >= 0 && activeIndex < rows.length;
  const hasList = rows.length > 0;
  const isEmpty = isOpen && !hasList && landmarks.state.status !== 'loading';
  const emptyMessage = isEmpty ? `No place called ‘${query.trim()}’ yet` : '';
  const hasFailed = landmarks.state.status === 'failed';
  // The hintuans near the landmark chosen, for its panel (decision 8).
  const near = landmark
    ? routesNearHere(landmark.reach, hotspots, (id) =>
        directionsAt(id).map((direction) => direction.id),
      )
    : [];
  const announcement = announce({
    isOpen,
    emptyMessage,
    hasFailed,
    landmark,
    nearCount: near.length,
  });

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setActiveIndex(-1);
    setFrom(text.trim() === '' ? null : whereNow());
    if (text.trim() !== '') {
      setLandmark(null);
      onSearchRestart?.();
      landmarks.ask();
    }
  };

  const handlePick = (row: SearchRow) => {
    handleQueryChange('');
    if (row.type === 'place') {
      onPick(boxToOpen(row.match));
    } else {
      onLookAt(row.match.landmark.point);
      if (onPickLandmark) onPickLandmark(row.match.landmark);
      else setLandmark(row.match.landmark);
    }
  };

  // The field keeps focus (aria-activedescendant), so the browser would not scroll the row in.
  const moveTo = (index: number) => {
    setActiveIndex(index);
    document.getElementById(resultId(listId, index))?.scrollIntoView({ block: 'nearest' });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (isOpen) handleQueryChange('');
      else {
        setLandmark(null);
        onSearchRestart?.();
      }
    } else if (event.key === 'ArrowDown' && hasList) {
      event.preventDefault();
      moveTo(hasActive ? (activeIndex + 1) % rows.length : 0);
    } else if (event.key === 'ArrowUp' && hasList) {
      event.preventDefault();
      moveTo(activeIndex <= 0 ? rows.length - 1 : activeIndex - 1);
    } else if (event.key === 'Enter' && hasList) {
      event.preventDefault();
      handlePick(rows[hasActive ? activeIndex : 0]);
    }
  };

  const handlePickHintuan = (hintuan: Hotspot) => {
    setLandmark(null);
    onPick(hintuan);
  };

  // Given the caller's handler only: without it, the panel has no "Go here".
  const handleGoHere =
    onGoHere &&
    ((hintuan: Hotspot) => {
      if (!landmark) return;
      setLandmark(null);
      onGoHere(landmark, near, hintuan);
    });

  return {
    listId,
    query,
    rows,
    landmarks,
    landmark,
    near,
    isOpen,
    hasList,
    activeIndex: hasActive ? activeIndex : -1,
    emptyMessage,
    announcement,
    handleQueryChange,
    handlePick,
    handleKeyDown,
    handlePickHintuan,
    handleGoHere,
    closeLandmark: () => setLandmark(null),
  };
}
