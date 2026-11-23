import type { MapLibreMap } from 'maplibre-gl';
import { useLayoutEffect, useRef } from 'react';

/**
 * For a control on the map that hides once pressed (the Overview button, its fit settled): if it
 * hides while it has the focus, the focus goes to the map, where a keyboard pans it on, not to the
 * page's body. Read before the browser lets go of the hidden button's focus. The returned ref goes
 * on what hides.
 */
export function useFocusMapOnHide(isShown: boolean, map: MapLibreMap | null) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!isShown && ref.current?.contains(document.activeElement)) map?.getCanvas().focus();
  }, [isShown, map]);
  return ref;
}
