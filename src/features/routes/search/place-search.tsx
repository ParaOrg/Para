import { useId, useState, type KeyboardEvent } from 'react';

import { TextField } from '@/design-system/primitives/text-field';
import { cn } from '@/shared/utils/cn';
import type { LngLat } from '@/shared/utils/geo';

import { PlaceSearchResults, resultId } from './place-search-results';
import type { Hotspot } from '../model/hotspots';
import { searchPlaces, searchablePlaces, type PlaceMatch } from '../model/place-search';

/** The most results listed: more than a phone shows above its keyboard. */
const MAX_RESULTS = 8;

interface PlaceSearchProps {
  hotspots: readonly Hotspot[];
  /**
   * Where the commuter is now, when location is on, read as they type (the page keeps the fix in a
   * ref so a fix renders nothing): equal matches list nearest first.
   */
  whereNow?: () => LngLat | null;
  /** A place chosen: the box to open it by (its terminal, else its first box). */
  onPick: (hotspot: Hotspot) => void;
}

/** The box a place opens by, as a tap on its name would: its terminal, else its first box. */
function boxToOpen(match: PlaceMatch): Hotspot {
  const { hotspots } = match.place;
  return hotspots.find((h) => h.kind === 'terminal') ?? hotspots[0];
}

const NOWHERE = () => null;

/**
 * Search Para's own places (.scratch/place-search, step 1): a field, and under it the places
 * the text matches, best first. A combobox: the arrows move through the results, Enter opens
 * the one on, Escape empties the field. Choosing a place hands its box to `onPick`, which opens
 * it as a tap on the map does.
 */
export function PlaceSearch({ hotspots, whereNow = NOWHERE, onPick }: PlaceSearchProps) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  // Where the commuter was at the last keystroke: read in the handler, never during render.
  const [from, setFrom] = useState<LngLat | null>(null);
  const isOpen = query.trim() !== '';
  const matches = isOpen
    ? searchPlaces(query, searchablePlaces(hotspots), from).slice(0, MAX_RESULTS)
    : [];
  const hasActive = activeIndex >= 0 && activeIndex < matches.length;
  const hasList = matches.length > 0;
  const emptyMessage = isOpen && !hasList ? `No place called ‘${query.trim()}’ yet` : '';

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setActiveIndex(-1);
    setFrom(text.trim() === '' ? null : whereNow());
  };

  const handlePick = (match: PlaceMatch) => {
    handleQueryChange('');
    onPick(boxToOpen(match));
  };

  // The field keeps focus (aria-activedescendant), so the browser would not scroll the row in.
  const moveTo = (index: number) => {
    setActiveIndex(index);
    document.getElementById(resultId(listId, index))?.scrollIntoView({ block: 'nearest' });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      handleQueryChange('');
    } else if (event.key === 'ArrowDown' && hasList) {
      event.preventDefault();
      moveTo(hasActive ? (activeIndex + 1) % matches.length : 0);
    } else if (event.key === 'ArrowUp' && hasList) {
      event.preventDefault();
      moveTo(activeIndex <= 0 ? matches.length - 1 : activeIndex - 1);
    } else if (event.key === 'Enter' && matches.length > 0) {
      event.preventDefault();
      handlePick(matches[hasActive ? activeIndex : 0]);
    }
  };

  return (
    <div role="search" className="flex flex-col gap-2">
      <TextField
        label="Search places"
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onClear={() => handleQueryChange('')}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={hasList}
        aria-controls={hasList ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={hasActive ? resultId(listId, activeIndex) : undefined}
        autoComplete="off"
        enterKeyHint="search"
        spellCheck={false}
      />
      {hasList && (
        <PlaceSearchResults
          id={listId}
          matches={matches}
          activeIndex={hasActive ? activeIndex : -1}
          onPick={handlePick}
        />
      )}
      {/*
        Mounted for as long as the search is, so a screen reader hears its text change; a live
        region inserted with its text already in is often not read at all.
      */}
      <p
        role="status"
        className={cn(
          emptyMessage
            ? 'rounded-xl bg-surface px-4 py-3 text-sm text-content-secondary shadow-large'
            : 'sr-only',
        )}
      >
        {emptyMessage}
      </p>
    </div>
  );
}
