import type { MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import { useEffect } from 'react';

import type { LngLat } from '@/shared/utils/geo';

import {
  UPLOADS_LINE,
  UPLOADS_SRC,
  addContributionLayers,
  removeContributionLayers,
  setOpened,
  setUploads,
} from './contribution-layers';
import type { Contribution, ContributionDetail } from '../data/contributions-read';

/**
 * The uploads on the studio's map while the Contributors map is open: the
 * list's uploads faint, the opened one strong with its whole trail and hintos.
 * A tap on a line opens that upload, as its row in the list does.
 */
export function useContributionLayers(
  map: MapLibreMap | null,
  contributions: readonly Contribution[],
  openedId: string | null,
  detail: ContributionDetail | null,
  onOpen: (id: string) => void,
) {
  useEffect(() => {
    if (!map) return;
    addContributionLayers(map);
    return () => removeContributionLayers(map);
  }, [map]);

  useEffect(() => {
    if (map) setUploads(map, contributions);
  }, [map, contributions]);

  useEffect(() => {
    if (!map) return;
    for (const c of contributions) {
      map.setFeatureState({ source: UPLOADS_SRC, id: c.id }, { opened: c.id === openedId });
    }
  }, [map, contributions, openedId]);

  useEffect(() => {
    if (map) setOpened(map, detail);
  }, [map, detail]);

  // The opened upload in view: its box, or its whole trail once read.
  const opened = contributions.find((c) => c.id === openedId) ?? null;
  const box = opened?.box ?? null;
  useEffect(() => {
    if (!map || !box) return;
    const [west, south, east, north] = box;
    const sw: LngLat = [west, south];
    const ne: LngLat = [east, north];
    map.fitBounds([sw, ne], { padding: 48, maxZoom: 16, duration: 0 });
  }, [map, box]);

  useEffect(() => {
    if (!map) return;
    const handleClick = (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties.id;
      if (typeof id === 'string') onOpen(id);
    };
    map.on('click', UPLOADS_LINE, handleClick);
    return () => {
      map.off('click', UPLOADS_LINE, handleClick);
    };
  }, [map, onOpen]);
}
