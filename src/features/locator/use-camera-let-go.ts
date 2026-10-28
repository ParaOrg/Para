import type { MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';

import type { Camera } from './locator-rules';

/**
 * Any move of the camera off the commuter, however slight — a finger's, or
 * the app's for them (APP_MOVE: a hintuan picked, an end tapped), which
 * the next fix would otherwise undo — and the button says so
 * (TrackOwnLocation). The camera's own glides here carry neither.
 */
export function useCameraLetGo(map: MapLibreMap | null, setCamera: (camera: Camera) => void): void {
  useEffect(() => {
    if (!map) return;
    const letGo = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) setCamera('free');
    };
    const appMoved = (e: object) => {
      if ('appMove' in e && e.appMove) setCamera('free');
    };
    map.on('dragstart', letGo);
    map.on('zoomstart', letGo);
    map.on('rotatestart', letGo);
    map.on('pitchstart', letGo);
    map.on('movestart', appMoved);
    return () => {
      map.off('dragstart', letGo);
      map.off('zoomstart', letGo);
      map.off('rotatestart', letGo);
      map.off('pitchstart', letGo);
      map.off('movestart', appMoved);
    };
  }, [map, setCamera]);
}
