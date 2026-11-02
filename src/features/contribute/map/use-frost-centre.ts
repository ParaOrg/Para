import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useState } from 'react';

import { metresPerPixel } from '@/shared/utils/geo';

import { FROST, type FrostCentre } from './frost-rings';
import type { MapWhere } from './map-where';

const NOWHERE: FrostCentre = { x: 0, y: 0, clearPx: FROST.clearMinPx, width: 0, height: 0 };

/** Where the frost clears now: the rider's dot on the screen, or the map's middle without one. */
function centreOf(map: MapLibreMap, where: MapWhere | null): FrostCentre {
  const box = map.getContainer();
  const width = box.clientWidth;
  const height = box.clientHeight;
  if (!where) return { x: width / 2, y: height / 2, clearPx: FROST.clearMinPx, width, height };
  const { x, y } = map.project(where.at);
  const ringPx = where.ringM / metresPerPixel(where.at[1], map.getZoom());
  return { x, y, clearPx: Math.max(FROST.clearMinPx, ringPx), width, height };
}

/**
 * The paused frost's centre: the rider's dot on the screen, worked out as it renders, so the
 * frost is whole in the very frame the pause is drawn. While `isFollowing` (the frost is on) a
 * move or resize of the map draws it again, at most once a frame; a clear map costs nothing.
 */
export function useFrostCentre(
  map: MapLibreMap | null,
  where: MapWhere | null,
  isFollowing: boolean,
): FrostCentre {
  const [, setMoves] = useState(0);
  useEffect(() => {
    if (!map || !isFollowing) return;
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setMoves((moves) => moves + 1);
      });
    };
    map.on('move', update);
    map.on('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      map.off('move', update);
      map.off('resize', update);
    };
  }, [map, isFollowing]);
  return map && isFollowing ? centreOf(map, where) : NOWHERE;
}
