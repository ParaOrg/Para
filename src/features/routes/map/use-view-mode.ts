import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

import { prefersReducedMotion } from '@/shared/utils/motion';

import { drawBuildingsFor } from './building-look';
import {
  VIEW_PITCH,
  otherViewMode,
  readViewMode,
  rememberViewMode,
  type ViewMode,
} from './view-mode';

/** How long the camera takes to tilt into or out of 3D. */
const TILT_MS = 600;

/**
 * The map's view, 2D or 3D (view-mode.ts), and the toggle ViewModeButton calls. The camera takes
 * the view's tilt as the map arrives, at once, and on a toggle, over TILT_MS (at once for a reduced
 * motion setting), and the buildings: flat in 2D, raised in 3D (drawBuildingsFor). The centre,
 * zoom and bearing stay.
 */
export function useViewMode(map: MapLibreMap | null): { mode: ViewMode; toggle: () => void } {
  const [mode, setMode] = useState(readViewMode);
  const isFirst = useRef(true);
  useEffect(() => {
    if (!map) return;
    const pitch = VIEW_PITCH[mode];
    if (isFirst.current) {
      isFirst.current = false;
      if (map.getPitch() !== pitch) map.jumpTo({ pitch });
      return;
    }
    map.easeTo({ pitch, duration: prefersReducedMotion() ? 0 : TILT_MS });
  }, [map, mode]);
  // The buildings as the view says, and again on each design switched in (its own layers).
  useEffect(() => {
    if (!map) return;
    const draw = () => drawBuildingsFor(map, mode);
    draw();
    map.on('style.load', draw);
    return () => {
      map.off('style.load', draw);
    };
  }, [map, mode]);
  const toggle = () => {
    const next = otherViewMode(mode);
    rememberViewMode(next);
    setMode(next);
  };
  return { mode, toggle };
}
