import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';

type CreditsState = 'shut' | 'open' | 'leaving';

export interface MapCredits {
  /** Shut, open, or closed and sliding down: drawn until it has gone. */
  state: CreditsState;
  /** Each opening a sheet of its own (its key), so one opened while the last slides down rises afresh. */
  openings: number;
  /** The sheet's code could not be fetched: MapLibre's corner credits are back in the ⓘ's place. */
  isSheetMissing: boolean;
  /** The ⓘ (MapCreditsDock): focus goes back to it as the sheet starts down. */
  buttonRef: RefObject<HTMLButtonElement | null>;
  open: () => void;
  /** ✕, Escape or a tap on the dimmed map: the sheet starts down. A stable reference. */
  close: () => void;
  /** The sheet is down and gone. A stable reference. */
  handleGone: () => void;
  /** The sheet's code could not be fetched. A stable reference. */
  handleSheetMissing: () => void;
  /** Called off while the sheet's code was still on its way. A stable reference. */
  cancel: () => void;
}

/**
 * The map's credits, the Map Data Source sheet, opened by the map's own ⓘ: on the public map and
 * the studio's. `mapBox` holds the map, for focus to go to MapLibre's corner ⓘ when the sheet's
 * code could not be fetched and the corner credits come back.
 */
export function useMapCredits(mapBox: RefObject<HTMLElement | null>): MapCredits {
  const [state, setState] = useState<CreditsState>('shut');
  const [openings, setOpenings] = useState(0);
  const [isSheetMissing, setIsSheetMissing] = useState(false);
  // The ⓘ turned inert under the sheet the moment it opened: the page is made live again first,
  // then focus goes back to it.
  const buttonRef = useRef<HTMLButtonElement>(null);
  const open = () => {
    setOpenings((n) => n + 1);
    setState('open');
  };
  const close = useCallback(() => {
    flushSync(() => setState('leaving'));
    buttonRef.current?.focus();
  }, []);
  const handleGone = useCallback(() => setState('shut'), []);
  const handleSheetMissing = useCallback(() => {
    setIsSheetMissing(true);
    setState('shut');
  }, []);
  const cancel = useCallback(() => {
    flushSync(() => setState('shut'));
    buttonRef.current?.focus();
  }, []);
  // Focus to the credits as they are now: MapLibre's corner ⓘ, back in the map.
  useEffect(() => {
    if (!isSheetMissing) return;
    mapBox.current?.querySelector<HTMLElement>('.maplibregl-ctrl-attrib-button')?.focus();
  }, [isSheetMissing, mapBox]);
  return {
    state,
    openings,
    isSheetMissing,
    buttonRef,
    open,
    close,
    handleGone,
    handleSheetMissing,
    cancel,
  };
}
