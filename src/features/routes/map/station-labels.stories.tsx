import type { Meta, StoryObj } from '@storybook/react-vite';
import { Map as MapLibreMap } from 'maplibre-gl';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';

import type { LngLat } from '@/shared/utils/geo';

import { StationLabels } from './station-labels';
import { CARD_SURFACE, CARD_SURFACE_PALE } from '../cards/livery-card';
import type { Hotspot } from '../model/hotspots';
import type { Direction } from '../model/routes';
import type { TimelineRow } from '../model/timeline';

import 'maplibre-gl/dist/maplibre-gl.css';

type StationLabelsProps = Omit<ComponentProps<typeof StationLabels>, 'map'> & {
  /** How far in the map is: the names go once the scale bar reads 3 km. */
  zoom?: number;
};

/**
 * The dots are DOM markers, so they need a real map to sit on. An empty
 * inline style stands in, so the story fetches no tiles (as BasemapControl's
 * do), and no line is drawn under them: the story is the dots and names
 * alone.
 */
function OnAnEmptyMap({ zoom = 14, ...props }: StationLabelsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const created = new MapLibreMap({
      container: containerRef.current,
      style: { version: 8, sources: {}, layers: [] },
      center: [121.05, 14.7478],
      zoom,
      attributionControl: false,
    });
    setMap(created);
    return () => {
      setMap(null);
      created.remove();
    };
  }, [zoom]);

  return (
    <>
      <div ref={containerRef} className="h-full w-full" />
      {map && <StationLabels {...props} map={map} />}
    </>
  );
}

/**
 * Sample trip only: Tala to Novaliches, and the five hintuans down a slope
 * between them: the rows are the timeline's `between`, which leaves the
 * trip's own ends out, as both apps pass it. Not read from anywhere. The
 * direction has no drawn line, so each row sits at its hotspot's own point
 * (rowStops).
 */
const route = {
  id: 'sample-route',
  signboard: null,
  longName: null,
  mode: 'jeepney',
  fareNote: null,
  headHotspotId: 'tala',
  tailHotspotId: 'novaliches',
  via: null,
  name: 'Tala – Novaliches',
} as const;

const direction: Direction = {
  id: 'sample-out',
  routeId: route.id,
  name: 'Tala → Novaliches',
  originTerminal: null,
  destinationTerminal: null,
  shape: null,
  reversed: false,
  confidence: 'drawn',
  route,
};

const STOPS: readonly (readonly [string, string, LngLat])[] = [
  ['barracks', 'Barracks', [121.0445, 14.7508]],
  ['malaria', 'Malaria', [121.0467, 14.7493]],
  ['pangarap', 'Pangarap', [121.0489, 14.7478]],
  ['amparo', 'Amparo', [121.0511, 14.7463]],
  ['fatima', 'Fatima', [121.0533, 14.7448]],
];

const hotspots: Hotspot[] = STOPS.map(([id, name, coordinates]) => ({
  id,
  name,
  informal: null,
  aliases: [],
  kind: 'hintuan',
  point: { type: 'Point', coordinates },
  area: null,
  note: null,
  createdAt: '2026-09-12T00:00:00Z',
}));

const rows: TimelineRow[] = STOPS.map(([id, label]) => ({ id, label, kind: 'hintuan' }));

const meta = {
  title: 'Features/Routes/StationLabels',
  component: OnAnEmptyMap,
  decorators: [
    (Story) => (
      <div className="relative h-[300px] w-[390px] overflow-clip bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: { selected: direction, hotspots, rows, livery: 'rose', onPick: fn() },
} satisfies Meta<typeof OnAnEmptyMap>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The dots' markers, once the map has put `count` of them there. */
const stationsOf = async (root: HTMLElement, count: number): Promise<HTMLElement[]> => {
  let stations: HTMLElement[] = [];
  await waitFor(() => {
    stations = [...root.querySelectorAll<HTMLElement>('[data-testid="station-label"]')];
    expect(stations).toHaveLength(count);
  });
  return stations;
};

/** The station named so, whose label's words say it. */
const stationNamed = (stations: readonly HTMLElement[], name: string): HTMLElement => {
  const station = stations.find(
    (s) => s.querySelector('[data-part="words"]')?.textContent === name,
  );
  if (!station) throw new Error(`no station named ${name} rendered`);
  return station;
};

/** The dot: the first thing inside the marker's tap box. */
const dotOf = (station: HTMLElement): HTMLElement => {
  const dot = station.querySelector<HTMLElement>('.station-label-tap > span:first-child');
  if (!dot) throw new Error('no dot rendered');
  return dot;
};

/** The label's opacity: 1 along the ride, 0.6 on the pale. */
const labelOpacity = (station: HTMLElement) => {
  const label = station.querySelector('[data-part="label"]');
  if (!label) throw new Error('no label rendered');
  return getComputedStyle(label).opacity;
};

/** The colour a token class paints, read off a probe wearing it. */
const wornBy = (className: string) => {
  const probe = document.createElement('i');
  probe.className = className;
  document.body.append(probe);
  const colour = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return colour;
};

/** The pops run out (hintuan-pin.css, hintuan-label.css). */
const settled = (root: HTMLElement) =>
  Promise.all(root.getAnimations({ subtree: true }).map((animation) => animation.finished));

/** Nothing picked: a dot at each of the five hintuans, ringed in the line's colour, each named in full. */
export const AtRest: Story = {
  play: async ({ canvasElement }) => {
    const stations = await stationsOf(canvasElement, 5);
    await settled(canvasElement);
    await expect(stations.map((s) => s.querySelector('[data-part="words"]')?.textContent)).toEqual(
      rows.map((r) => r.label),
    );
    for (const station of stations) {
      await expect(station).not.toHaveAttribute('data-paled');
      await expect(station).not.toHaveAttribute('data-far');
      await expect(labelOpacity(station)).toBe('1');
      await expect(getComputedStyle(dotOf(station)).backgroundColor).toBe(
        wornBy(CARD_SURFACE.rose),
      );
    }
    // Both apps give `onPick`: each dot and its name are one button, named for the row.
    for (const [i, station] of stations.entries()) {
      const buttons = station.querySelectorAll('button');
      await expect(buttons).toHaveLength(1);
      await expect(buttons[0]).toHaveAttribute('aria-label', rows[i].label);
    }
  },
};

/** A tap on a station's button hands `onPick` the row's id, and the map beneath never hears it. */
export const TapPicksTheRow: Story = {
  play: async ({ canvasElement, args }) => {
    const stations = await stationsOf(canvasElement, 5);
    await settled(canvasElement);
    const button = stationNamed(stations, 'Pangarap').querySelector('button');
    if (!button) throw new Error('no button rendered');
    await userEvent.click(button);
    await expect(args.onPick).toHaveBeenCalledTimes(1);
    await expect(args.onPick).toHaveBeenCalledWith('pangarap');
  },
};

/**
 * A ride drawn from Malaria to Amparo (`hasRide`): the picks are left to their
 * own pins, so three dots remain; the rows outside the ride, Barracks and
 * Fatima, ring in the card's pale and their names are the Label's Unselected,
 * at 60%. Pangarap, inside it, keeps the line's colour.
 */
export const WithARide: Story = {
  args: { startId: 'malaria', pickedId: 'amparo', hasRide: true },
  play: async ({ canvasElement }) => {
    const stations = await stationsOf(canvasElement, 3);
    await settled(canvasElement);
    for (const name of ['Barracks', 'Fatima']) {
      const station = stationNamed(stations, name);
      await expect(station).toHaveAttribute('data-paled');
      await expect(labelOpacity(station)).toBe('0.6');
      await expect(getComputedStyle(dotOf(station)).backgroundColor).toBe(
        wornBy(CARD_SURFACE_PALE.rose),
      );
    }
    const inside = stationNamed(stations, 'Pangarap');
    await expect(inside).not.toHaveAttribute('data-paled');
    await expect(labelOpacity(inside)).toBe('1');
    await expect(getComputedStyle(dotOf(inside)).backgroundColor).toBe(wornBy(CARD_SURFACE.rose));
  },
};

/**
 * A start picked alone (`startId`, no ride): its own pin takes Malaria's
 * place, and every other row is on the pale with the whole line.
 */
export const StartAlone: Story = {
  args: { startId: 'malaria' },
  play: async ({ canvasElement }) => {
    const stations = await stationsOf(canvasElement, 4);
    await settled(canvasElement);
    await expect(stations.map((s) => s.querySelector('[data-part="words"]')?.textContent)).toEqual([
      'Barracks',
      'Pangarap',
      'Amparo',
      'Fatima',
    ]);
    for (const station of stations) {
      await expect(station).toHaveAttribute('data-paled');
      await expect(labelOpacity(station)).toBe('0.6');
      await expect(getComputedStyle(dotOf(station)).backgroundColor).toBe(
        wornBy(CARD_SURFACE_PALE.rose),
      );
    }
  },
};

/**
 * An end row picked with the start kept (`endPicked`, useRideTo): Pangarap
 * the start, the ride on to where the trip goes. The rows before the start
 * are outside it and on the pale; the rows after it ride on, in the line's
 * colour.
 */
export const StartKeptToTheEnd: Story = {
  args: { startId: 'pangarap', endPicked: 'to', hasRide: true },
  play: async ({ canvasElement }) => {
    const stations = await stationsOf(canvasElement, 4);
    await settled(canvasElement);
    for (const name of ['Barracks', 'Malaria']) {
      const station = stationNamed(stations, name);
      await expect(station).toHaveAttribute('data-paled');
      await expect(labelOpacity(station)).toBe('0.6');
    }
    for (const name of ['Amparo', 'Fatima']) {
      const station = stationNamed(stations, name);
      await expect(station).not.toHaveAttribute('data-paled');
      await expect(labelOpacity(station)).toBe('1');
    }
  },
};

/**
 * Zoomed out past the scale bar's 3 km: the dots alone, smaller, so the
 * names never pile up.
 */
export const ZoomedOut: Story = {
  args: { zoom: 11 },
  play: async ({ canvasElement }) => {
    const stations = await stationsOf(canvasElement, 5);
    await settled(canvasElement);
    for (const [i, station] of stations.entries()) {
      await expect(station).toHaveAttribute('data-far');
      await expect(getComputedStyle(dotOf(station)).scale).toBe('0.6');
      // The button is still named for the row, with no name drawn beside it.
      await expect(station.querySelector('button')).toHaveAttribute('aria-label', rows[i].label);
    }
    await expect(canvasElement.querySelector('[data-part="hintuan-name"]')).toBeNull();
  },
};
