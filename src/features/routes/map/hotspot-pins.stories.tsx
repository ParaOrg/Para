import type { Meta, StoryObj } from '@storybook/react-vite';
import { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { expect, waitFor } from 'storybook/test';

import type { LngLat } from '@/shared/utils/geo';

import { addPinLayer } from './hotspot-pin-images';
import { DOT, PIN, PINS_FROM_ZOOM, pinImageOf } from './hotspot-pins';
import { HINTUAN_LABEL, LABEL } from './saved-hotspots-labels';
import { addSavedHotspots } from './saved-hotspots-layers';
import type { Hotspot } from '../model/hotspots';

import 'maplibre-gl/dist/maplibre-gl.css';

/** Sample places only: a terminal box and, across the road, a hintuan's U round a corner. */
const CENTRE: LngLat = [121.0467, 14.7478];

const box = (id: string, kind: Hotspot['kind'], ring: LngLat[]): Hotspot => ({
  id,
  name: kind === 'terminal' ? 'Sample Terminal' : 'Sample Hintuan',
  informal: null,
  aliases: [],
  kind,
  point: { type: 'Point', coordinates: ring[0] },
  area: { type: 'Polygon', coordinates: [[...ring, ring[0]]] },
  note: null,
  createdAt: '2026-11-04T00:00:00Z',
});

const [x, y] = CENTRE;
const SAMPLE = [
  box('terminal', 'terminal', [
    [x - 0.0009, y + 0.0001],
    [x - 0.0002, y + 0.0001],
    [x - 0.0002, y + 0.0005],
    [x - 0.0009, y + 0.0005],
  ]),
  // A U open to the north: its centroid falls in the gap, so its pin stands in an arm (boxCentre).
  box('hintuan', 'hintuan', [
    [x + 0.0002, y - 0.0006],
    [x + 0.0008, y - 0.0006],
    [x + 0.0008, y],
    [x + 0.0006, y],
    [x + 0.0006, y - 0.0004],
    [x + 0.0004, y - 0.0004],
    [x + 0.0004, y],
    [x + 0.0002, y],
  ]),
];

interface HotspotPinsOnAMapProps {
  /** The map's zoom: from PINS_FROM_ZOOM a pin, below it a dot. */
  zoom: number;
}

/**
 * The boxes, their dots and their pins, as the map draws them, on an empty
 * inline style that fetches no tiles. The style has no glyphs, so the names
 * are taken off as soon as they are added: this story is the pins'.
 */
function HotspotPinsOnAMap({ zoom }: HotspotPinsOnAMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: { version: 8, sources: {}, layers: [] },
      center: CENTRE,
      zoom,
      attributionControl: false,
      validateStyle: false,
    });
    map.once('load', () => {
      addSavedHotspots(map, SAMPLE);
      addPinLayer(map);
      for (const id of [LABEL, HINTUAN_LABEL]) map.removeLayer(id);
      containerRef.current?.setAttribute('data-drawn', 'true');
    });
    // For the play functions: the map, from the story's root.
    Object.assign(containerRef.current, { map });
    return () => map.remove();
  }, [zoom]);

  return <div ref={containerRef} className="h-full w-full" />;
}

const meta = {
  title: 'Features/Routes/HotspotPins',
  component: HotspotPinsOnAMap,
  // A phone-wide strip of map.
  decorators: [
    (Story) => (
      <div className="relative h-[240px] w-[393px] overflow-clip bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HotspotPinsOnAMap>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The story's map, once its hotspots are drawn. */
const drawnMap = async (root: HTMLElement): Promise<MapLibreMap> => {
  let map: MapLibreMap | null = null;
  await waitFor(() => {
    const host = root.querySelector<HTMLElement & { map?: MapLibreMap }>('[data-drawn="true"]');
    expect(host?.map).toBeDefined();
    map = host?.map ?? null;
  });
  if (!map) throw new Error('no map drawn');
  return map;
};

/** Zoomed in (a phone spanning under 500 m): each box with its pin, the stem's foot on its middle. */
export const ZoomedIn: Story = {
  args: { zoom: 17.2 },
  play: async ({ canvasElement }) => {
    const map = await drawnMap(canvasElement);
    await expect(map.hasImage(pinImageOf('terminal'))).toBe(true);
    await expect(map.hasImage(pinImageOf('hintuan'))).toBe(true);
    await waitFor(() => expect(map.queryRenderedFeatures({ layers: [PIN] }).length).toBe(2));
  },
};

/** Zoomed out (a phone spanning over 500 m): each box with a 16 px dot, no pin. */
export const ZoomedOut: Story = {
  args: { zoom: Math.floor(PINS_FROM_ZOOM * 10) / 10 - 0.6 },
  play: async ({ canvasElement }) => {
    const map = await drawnMap(canvasElement);
    await waitFor(() => expect(map.queryRenderedFeatures({ layers: [DOT] }).length).toBe(2));
    await expect(map.queryRenderedFeatures({ layers: [PIN] })).toHaveLength(0);
  },
};

/**
 * Right at the threshold: the pins, and the dots' layer hidden. (A query still
 * finds the dots there, laid out in the zoom-15 tile under them: the same
 * box's, so a tap on one means what a tap on its pin does.)
 */
export const AtTheThreshold: Story = {
  args: { zoom: PINS_FROM_ZOOM },
  play: async ({ canvasElement }) => {
    const map = await drawnMap(canvasElement);
    await waitFor(() => expect(map.queryRenderedFeatures({ layers: [PIN] }).length).toBe(2));
    await expect(map.getLayer(DOT)?.isHidden(map.getZoom())).toBe(true);
  },
};
