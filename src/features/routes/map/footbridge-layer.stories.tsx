import type { Meta, StoryObj } from '@storybook/react-vite';
import { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import { expect, waitFor } from 'storybook/test';

import { addFootbridgeLayer } from './footbridge-layer';
import { FOOTBRIDGE_LAYERS } from './footbridge-zoom';
import type { Footbridge } from '../published/footbridge-file-schema';

import 'maplibre-gl/dist/maplibre-gl.css';

/** Sample footbridges only: one across a road with an elevator at its end, one covered. */
const FOOTBRIDGES: Footbridge[] = [
  {
    id: 'w1',
    name: 'Sample Footbridge',
    isCovered: false,
    lines: [
      [
        [121.0495, 14.65],
        [121.0505, 14.65],
      ],
    ],
    access: [{ kind: 'elevator', point: [121.0505, 14.65] }],
  },
  {
    id: 'w2',
    name: null,
    isCovered: true,
    lines: [
      [
        [121.0495, 14.6492],
        [121.0505, 14.6488],
      ],
    ],
    access: [{ kind: 'steps', point: [121.0495, 14.6492] }],
  },
];

declare global {
  interface Window {
    /** The story's map, for its play to ask what it drew. */
    __storyMap?: MapLibreMap;
  }
}

interface OnAnEmptyMapProps {
  zoom: number;
}

/**
 * The layer on a real map with an empty inline style, so the story fetches no tiles (as
 * HintuanPin's do); `window.__storyMap` lets the play ask the map what it drew.
 */
function OnAnEmptyMap({ zoom }: OnAnEmptyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: { version: 8, sources: {}, layers: [] },
      center: [121.05, 14.6495],
      zoom,
      attributionControl: false,
    });
    map.once('load', () => addFootbridgeLayer(map, FOOTBRIDGES));
    window.__storyMap = map;
    return () => map.remove();
  }, [zoom]);
  return <div ref={containerRef} className="h-[300px] w-full" />;
}

const meta = {
  title: 'Features/Routes/FootbridgeLayer',
  component: OnAnEmptyMap,
  decorators: [
    (Story) => (
      <div className="w-[390px] bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: { zoom: 17 },
} satisfies Meta<typeof OnAnEmptyMap>;

export default meta;
type Story = StoryObj<typeof meta>;

/** What the map drew from each of the layer's two layers. */
const drawn = () => {
  const map = window.__storyMap;
  if (!map?.getLayer(FOOTBRIDGE_LAYERS.line)) return { lines: -1, elevators: -1 };
  return {
    lines: map.queryRenderedFeatures({ layers: [FOOTBRIDGE_LAYERS.line] }).length,
    elevators: map.queryRenderedFeatures({ layers: [FOOTBRIDGE_LAYERS.elevator] }).length,
  };
};

/** At street level: both footbridges, covered or not alike, and the one elevator; steps are not drawn. */
export const StreetLevel: Story = {
  play: async () => {
    await waitFor(() => expect(drawn().lines).toBeGreaterThanOrEqual(2));
    await expect(drawn().elevators).toBe(1);
  },
};

/** Zoomed out past street level: nothing drawn. */
export const ZoomedOut: Story = {
  args: { zoom: 14 },
  play: async () => {
    await waitFor(() => expect(drawn().lines).toBe(0));
    await expect(drawn().elevators).toBe(0);
  },
};
