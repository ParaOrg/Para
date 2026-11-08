import type { Meta, StoryObj } from '@storybook/react-vite';
import { Map as MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { LngLat } from '@/shared/utils/geo';

import { LandmarkPin } from './landmark-pin';

import 'maplibre-gl/dist/maplibre-gl.css';

/** Sample points only: Fairview Terraces, and SM City Fairview south of it. */
const FIRST: LngLat = [121.06, 14.737];
const SECOND: LngLat = [121.0605, 14.733];
const ZOOM = 15;

interface OnAnEmptyMapProps {
  /** Where the first landmark picked is; a button picks the second. */
  at: LngLat;
}

/**
 * The pin is a DOM marker, so it needs a real map to sit on. An empty inline style stands in, so
 * the story fetches no tiles (as HintuanPin's do). The map is centred on the first point; a button
 * under it picks the second landmark, keyed anew as the public map keys it.
 */
function OnAnEmptyMap({ at }: OnAnEmptyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [picked, setPicked] = useState({ id: 'w2', at });

  useEffect(() => {
    if (!containerRef.current) return;
    const created = new MapLibreMap({
      container: containerRef.current,
      style: { version: 8, sources: {}, layers: [] },
      center: at,
      zoom: ZOOM,
      attributionControl: false,
    });
    setMap(created);
    return () => {
      setMap(null);
      created.remove();
    };
  }, [at]);

  return (
    <>
      <div ref={containerRef} className="h-[200px] w-full" />
      {map && <LandmarkPin key={picked.id} map={map} at={picked.at} />}
      <button type="button" onClick={() => setPicked({ id: 'w4', at: SECOND })}>
        Pick SM City Fairview
      </button>
    </>
  );
}

const meta = {
  title: 'Features/Routes/LandmarkPin',
  component: OnAnEmptyMap,
  decorators: [
    (Story) => (
      <div className="relative w-[390px] overflow-clip bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: { at: FIRST },
} satisfies Meta<typeof OnAnEmptyMap>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The pin's marker, once the map has put it there. */
const pinOf = async (root: HTMLElement): Promise<HTMLElement> => {
  let pin: HTMLElement | null = null;
  await waitFor(() => {
    pin = root.querySelector<HTMLElement>('[data-testid="landmark-pin"]');
    expect(pin).not.toBeNull();
  });
  if (!pin) throw new Error('no pin rendered');
  return pin;
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

/** The circle's centre, once its pop has run out. */
const centreOf = async (root: HTMLElement, pin: HTMLElement) => {
  await Promise.all(root.getAnimations({ subtree: true }).map((animation) => animation.finished));
  const circle = pin.querySelector(':scope > span:first-child')?.getBoundingClientRect();
  if (!circle) throw new Error('no circle rendered');
  return { x: circle.left + circle.width / 2, y: circle.top + circle.height / 2 };
};

/**
 * Where a landmark search landed: the picked hintuan's filled circle in a neutral, neither Start's
 * green nor End's red, on the landmark's point, taking no taps.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const pin = await pinOf(canvasElement);
    const circle = pin.querySelector<HTMLElement>(':scope > span:first-child');
    if (!circle) throw new Error('no circle rendered');
    const colour = getComputedStyle(circle).backgroundColor;
    await expect(colour).toBe(wornBy('bg-content-primary'));
    await expect(colour).not.toBe(wornBy('bg-card-red-surface'));
    await expect(colour).not.toBe(wornBy('bg-map-hotspots-card-hintuan-surface'));
    await expect(getComputedStyle(pin).pointerEvents).toBe('none');
    const map = canvasElement.querySelector('.maplibregl-map')?.getBoundingClientRect();
    if (!map) throw new Error('no map rendered');
    const centre = await centreOf(canvasElement, pin);
    await expect(centre.x).toBeCloseTo(map.left + map.width / 2, 0);
    await expect(centre.y).toBeCloseTo(map.top + map.height / 2, 0);
  },
};

/** Another landmark picked: one pin still, now on the second point, south of the first. */
export const AnotherPick: Story = {
  play: async ({ canvasElement }) => {
    const before = await centreOf(canvasElement, await pinOf(canvasElement));
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Pick SM City Fairview' }),
    );
    await waitFor(async () => {
      const after = await centreOf(canvasElement, await pinOf(canvasElement));
      await expect(after.y).toBeGreaterThan(before.y + 100);
    });
    await expect(canvasElement.querySelectorAll('[data-testid="landmark-pin"]')).toHaveLength(1);
  },
};
