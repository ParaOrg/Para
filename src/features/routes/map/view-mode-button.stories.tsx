import type { Meta, StoryObj } from '@storybook/react-vite';
import { Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useEffect, useRef, useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { MapStyleButton } from './map-style-button';
import { useViewMode } from './use-view-mode';
import { VIEW_MODE_KEY, VIEW_PITCH } from './view-mode';
import { ViewModeButton } from './view-mode-button';

import 'maplibre-gl/dist/maplibre-gl.css';

// The map's worker, as map-view sets it.
setWorkerUrl(maplibreWorkerUrl);

const meta = {
  title: 'Features/Routes/ViewModeButton',
  component: ViewModeButton,
  args: { mode: '2d', onToggle: fn() },
  decorators: [
    (Story) => (
      <div className="flex bg-bg-surface-secondary p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ViewModeButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A 2D map: the button shows "3D", where a tap goes. */
export const In2D: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Switch to 3D view' }));
    await expect(args.onToggle).toHaveBeenCalledOnce();
  },
};

/** A 3D map: the button shows "2D". */
export const In3D: Story = {
  args: { mode: '3d' },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: 'Switch to 2D view' }),
    ).toBeVisible();
  },
};

/** The lower half of LocationAndMap (4885:42127): under the Map design button's top half. */
export const InThePill: Story = {
  args: { corners: 'bottom' },
  render: (args) => (
    <div className="flex flex-col rounded-full shadow-sm">
      <MapStyleButton corners="top" currentLabel="Colour" />
      <ViewModeButton {...args} />
    </div>
  ),
};

declare global {
  interface Window {
    /** The story's map, for its play to read the tilt. */
    __storyMap?: MapLibreMap;
  }
}

/** A real map with an empty inline style and the hook, as a page holds them. */
function OnAMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const made = new MapLibreMap({
      container: containerRef.current,
      style: { version: 8, sources: {}, layers: [] },
      center: [121.05, 14.65],
      zoom: 16,
      attributionControl: false,
    });
    made.once('load', () => setMap(made));
    window.__storyMap = made;
    return () => made.remove();
  }, []);
  const { mode, toggle } = useViewMode(map);
  return (
    <div className="relative h-60 w-full">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-3 right-3">
        <ViewModeButton mode={mode} onToggle={toggle} />
      </div>
    </div>
  );
}

const pitch = () => Math.round(window.__storyMap?.getPitch() ?? -1);

/**
 * The hook on a map: a first visit is flat; a tap tilts it to 3D and the device keeps that; the
 * map made again (as after a reload) opens tilted, and a tap brings it back flat.
 */
export const OnAMapRemembers: StoryObj<typeof OnAMap> = {
  render: () => <OnAMap />,
  beforeEach: () => {
    localStorage.removeItem(VIEW_MODE_KEY);
    return () => localStorage.removeItem(VIEW_MODE_KEY);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(pitch()).toBe(VIEW_PITCH['2d']));
    await userEvent.click(canvas.getByRole('button', { name: 'Switch to 3D view' }));
    await waitFor(() => expect(pitch()).toBe(VIEW_PITCH['3d']));
    await expect(localStorage.getItem(VIEW_MODE_KEY)).toBe('3d');
    await expect(canvas.getByRole('button', { name: 'Switch to 2D view' })).toBeVisible();
  },
};

/** A visit after choosing 3D: the map opens tilted. */
export const OnAMapReturning: StoryObj<typeof OnAMap> = {
  render: () => <OnAMap />,
  beforeEach: () => {
    localStorage.setItem(VIEW_MODE_KEY, '3d');
    return () => localStorage.removeItem(VIEW_MODE_KEY);
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(pitch()).toBe(VIEW_PITCH['3d']));
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Switch to 2D view' }));
    await waitFor(() => expect(pitch()).toBe(VIEW_PITCH['2d']));
  },
};
