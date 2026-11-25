import type { Meta, StoryObj } from '@storybook/react-vite';
import { Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useEffect, useRef } from 'react';
import { expect, waitFor } from 'storybook/test';

import { addTerminalDots } from './terminal-dots-layer';
import { TERMINAL_DOTS } from './terminal-points';
import type { Terminal } from '../published/terminal-file-schema';

import 'maplibre-gl/dist/maplibre-gl.css';

// The map's worker, as map-view sets it: without it MapLibre 6 parses no GeoJSON, and draws nothing.
setWorkerUrl(maplibreWorkerUrl);

/** Sample terminals only, one of each kind. */
const TERMINALS: Terminal[] = [
  { osmId: 'n1', kind: 'jeepney', point: [121.0492, 14.6502], name: 'Sample Jeepney Terminal' },
  { osmId: 'n2', kind: 'uv', point: [121.0508, 14.6502], name: 'Sample UV Express Terminal' },
  { osmId: 'w3', kind: 'bus', point: [121.0492, 14.6488], name: 'Sample Bus Terminal' },
  { osmId: 'n4', kind: 'unknown', point: [121.0508, 14.6488], name: 'Sample Terminal' },
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
 * The studio's possible terminals on a real map with an empty inline style, so the story fetches
 * no tiles. The style has no glyphs, so the names are taken off as soon as they are added: this
 * story is the dots'. `window.__storyMap` lets the play ask the map what it drew.
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
      validateStyle: false,
    });
    map.once('load', () => {
      addTerminalDots(map, TERMINALS);
      map.removeLayer(TERMINAL_DOTS.name);
    });
    window.__storyMap = map;
    return () => map.remove();
  }, [zoom]);
  return <div ref={containerRef} className="h-[300px] w-full" />;
}

const meta = {
  title: 'Features/Routes/TerminalDots',
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

/** How many dots the story's map drew. */
const dotsDrawn = () => {
  const map = window.__storyMap;
  if (!map?.getLayer(TERMINAL_DOTS.dot)) return -1;
  return map.queryRenderedFeatures({ layers: [TERMINAL_DOTS.dot] }).length;
};

/** Up close: a faint dot for every kind, the not known one too. */
export const UpClose: Story = {
  play: async () => {
    await waitFor(() => expect(dotsDrawn()).toBe(TERMINALS.length));
  },
};

/** Zoomed out past the district: nothing drawn. */
export const ZoomedOut: Story = {
  args: { zoom: 12 },
  play: async () => {
    await waitFor(() => expect(dotsDrawn()).toBe(0));
  },
};
