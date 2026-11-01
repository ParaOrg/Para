import { useEffect, useRef, type RefObject } from 'react';

import type { ToolbarTab } from './bottom-toolbar';
import type * as ToolbarSlideChunk from './toolbar-slide';
import { retryingImport } from '../common/retrying-import';

/*
 * The slide's own code (toolbar-slide.ts) is a chunk of its own, kept off the page's opening: it is
 * fetched with History and Account once Start is idle (warmToolbarSlide), and otherwise by the
 * first press on the bar, which it then picks up from.
 */
let slideChunk: typeof ToolbarSlideChunk | null = null;
const importSlide = retryingImport(() => import('./toolbar-slide'));
const loadSlide = (): Promise<typeof ToolbarSlideChunk> =>
  importSlide().then((chunk) => (slideChunk = chunk));

/** Fetches the slide's code ahead of the first press: once Start is idle. */
export function warmToolbarSlide(): void {
  loadSlide().catch((error: unknown) => {
    console.warn("The toolbar's slide could not be fetched ahead; a press fetches it.", error);
  });
}

interface ToolbarSlideOptions {
  barRef: RefObject<HTMLDivElement | null>;
  pillRef: RefObject<HTMLSpanElement | null>;
  current: ToolbarTab;
  /** The tab the pill was let go on, when it is not the one showing: its screen opens. */
  onPick: (tab: ToolbarTab) => void;
}

/** Hold the toolbar and slide its pill to another tab (toolbar-slide.ts). */
export function useToolbarSlide({ barRef, pillRef, current, onPick }: ToolbarSlideOptions) {
  // The latest handler, read on release: the bar's listeners stay put across renders.
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  });

  useEffect(() => {
    const bar = barRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;
    let detach: (() => void) | null = null;
    let isGone = false;
    const attach = (chunk: typeof ToolbarSlideChunk, first?: PointerEvent) => {
      detach = chunk.attachToolbarSlide({
        bar,
        pill,
        current,
        onPick: (tab) => onPickRef.current(tab),
        first,
      });
    };
    if (slideChunk) {
      attach(slideChunk);
      return () => detach?.();
    }
    // Not here yet: the first press fetches it, and the slide begins from that press.
    const handleFirstPress = (e: PointerEvent) => {
      bar.removeEventListener('pointerdown', handleFirstPress);
      loadSlide().then(
        (chunk) => {
          if (!isGone) attach(chunk, e);
        },
        (error: unknown) => {
          console.warn("The toolbar's slide could not be fetched; its tabs work as taps.", error);
        },
      );
    };
    bar.addEventListener('pointerdown', handleFirstPress);
    return () => {
      isGone = true;
      bar.removeEventListener('pointerdown', handleFirstPress);
      detach?.();
    };
  }, [barRef, pillRef, current]);
}
