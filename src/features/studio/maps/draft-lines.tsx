import type { GeoJSONSource, MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import { useEffect } from 'react';

import { MAP_COLOURS, MAP_PAINT } from '@/design-system/foundation/map-colours';
import { firstLayerOfType } from '@/features/routes/map/layers';
import { roadWidth } from '@/features/routes/map/line-style';

import { draftLinesData } from './draft-lines-data';
import type { DraftRow } from '../data/review-schema';

const SRC = 'studio-draft-lines';
const LINE = 'studio-draft-lines-line';
const HIT = 'studio-draft-lines-hit';

/** Dash and gap, in line widths: what tells a draft from a saved route without colour. */
const DRAFT_DASH = [2, 2];

interface DraftLinesProps {
  map: MapLibreMap | null;
  drafts: DraftRow[];
  onReview: (id: string) => void;
}

/**
 * The drafts' drawn ways on the map, in the saved routes' colour and width but
 * dashed. A tap on one opens that draft's review, as its marker does.
 */
export function DraftLines({ map, drafts, onReview }: DraftLinesProps) {
  useEffect(() => {
    if (!map) return;
    // Under the basemap's labels, as the saved routes are.
    const before = firstLayerOfType(map, 'symbol');
    map.addSource(SRC, { type: 'geojson', data: draftLinesData([]) });
    map.addLayer(
      {
        id: LINE,
        type: 'line',
        source: SRC,
        paint: {
          'line-color': MAP_COLOURS['Map/RouteLine/surface-default'],
          'line-width': roadWidth(0),
          'line-dasharray': DRAFT_DASH,
        },
      },
      before,
    );
    map.addLayer(
      {
        id: HIT,
        type: 'line',
        source: SRC,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': MAP_PAINT['Paint/hit'],
          'line-width': roadWidth(14),
          'line-opacity': 0,
        },
      },
      before,
    );
    return () => {
      for (const id of [HIT, LINE]) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(SRC)) map.removeSource(SRC);
    };
  }, [map]);

  useEffect(() => {
    map?.getSource<GeoJSONSource>(SRC)?.setData(draftLinesData(drafts));
  }, [map, drafts]);

  useEffect(() => {
    if (!map) return;
    const handleClick = (event: MapLayerMouseEvent) => {
      const draftId: unknown = event.features?.[0]?.properties.draftId;
      if (typeof draftId === 'string') onReview(draftId);
    };
    const handleEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const handleLeave = () => {
      map.getCanvas().style.cursor = '';
    };
    map.on('click', HIT, handleClick);
    map.on('mouseenter', HIT, handleEnter);
    map.on('mouseleave', HIT, handleLeave);
    return () => {
      map.off('click', HIT, handleClick);
      map.off('mouseenter', HIT, handleEnter);
      map.off('mouseleave', HIT, handleLeave);
    };
  }, [map, onReview]);

  return null;
}
