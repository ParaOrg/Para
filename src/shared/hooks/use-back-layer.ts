import { useEffect, useRef } from 'react';

/*
 * What the phone's Back closes: the layers over a page, the one opened last first. A layer is a
 * question, a card, a sheet, a page over another or a screen with its own hash; each registers
 * while it shows (useBackLayer), with what its own back control does. The contributor app's
 * Android Back asks the top one to close (features/contribute/navigation/use-android-back.ts);
 * with none open it leaves the app. On a page nothing asks, a layer's registration does nothing,
 * and the browser's Back stays the history's.
 */

interface BackLayer {
  close: () => void;
}

const layers: BackLayer[] = [];

/** Puts a layer on top, closed by `close`. Returns its removal, for when it no longer shows. */
export function pushBackLayer(close: () => void): () => void {
  const layer: BackLayer = { close };
  layers.push(layer);
  return () => {
    const at = layers.indexOf(layer);
    if (at !== -1) layers.splice(at, 1);
  };
}

/** While `isOpen`, Back closes this layer with `close`: the safe answer, Cancel, its back arrow. */
export function useBackLayer(isOpen: boolean, close: () => void): void {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!isOpen) return;
    return pushBackLayer(() => closeRef.current());
  }, [isOpen]);
}

/** Closes the layer opened last. Whether there was one: none means Back leaves the app. */
export function closeTopLayer(): boolean {
  const top = layers.at(-1);
  if (!top) return false;
  top.close();
  return true;
}

/** How many layers are open, for the checks. */
export function openLayerCount(): number {
  return layers.length;
}
