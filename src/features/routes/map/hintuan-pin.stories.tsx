import type { Meta, StoryObj } from '@storybook/react-vite';
import { Map as MapLibreMap } from 'maplibre-gl';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';

import type { LngLat } from '@/shared/utils/geo';

import { HintuanPin } from './hintuan-pin';

import 'maplibre-gl/dist/maplibre-gl.css';

/** Sample point only: Tala. */
const PIN_AT: LngLat = [121.0467, 14.7478];
const ZOOM = 15;

/**
 * How far east of the pin the map is centred, in degrees: the pin stands
 * left of the middle, so its name, 256 wide at most, hangs in view.
 */
const EAST_OF_PIN = 0.0023;

/** MapLibre's world is 512 px at zoom 0: the pixels a degree of longitude spans. */
const PX_PER_DEGREE = (512 * 2 ** ZOOM) / 360;

type PinProps = Omit<ComponentProps<typeof HintuanPin>, 'map'>;

/**
 * The pin is a DOM marker, so it needs a real map to sit on. An empty inline
 * style stands in, so the story fetches no tiles (as BasemapControl's do);
 * the pin stands left of the map's centre.
 */
function OnAnEmptyMap(props: Omit<PinProps, 'at'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const created = new MapLibreMap({
      container: containerRef.current,
      style: { version: 8, sources: {}, layers: [] },
      center: [PIN_AT[0] + EAST_OF_PIN, PIN_AT[1]],
      zoom: ZOOM,
      attributionControl: false,
    });
    setMap(created);
    return () => {
      setMap(null);
      created.remove();
    };
  }, []);

  return (
    <>
      <div ref={containerRef} className="h-full w-full" />
      {map && <HintuanPin {...props} map={map} at={PIN_AT} />}
    </>
  );
}

const meta = {
  title: 'Features/Routes/HintuanPin',
  component: OnAnEmptyMap,
  // A phone-wide strip of map: the pin left of the middle, its name hanging to the right.
  decorators: [
    (Story) => (
      <div className="relative h-[200px] w-[390px] overflow-clip bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: { label: 'Novaliches Terminal', livery: 'rose' },
} satisfies Meta<typeof OnAnEmptyMap>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The pin's marker, once the map has put it there. */
const pinOf = async (root: HTMLElement): Promise<HTMLElement> => {
  let pin: HTMLElement | null = null;
  await waitFor(() => {
    pin = root.querySelector<HTMLElement>('[data-testid="hintuan-pin"]');
    expect(pin).not.toBeNull();
  });
  if (!pin) throw new Error('no pin rendered');
  return pin;
};

/** A part of the pin's label, by its data-part. */
const partOf = (pin: HTMLElement, part: string): HTMLElement => {
  const el = pin.querySelector<HTMLElement>(`[data-part="${part}"]`);
  if (!el) throw new Error(`no ${part} rendered`);
  return el;
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

/** The circle: the first thing in the marker, ringed in the line's colour, End's red once picked as the end. */
const circleOf = (pin: HTMLElement): HTMLElement => {
  const dot = pin.querySelector<HTMLElement>(':scope > span:first-child');
  if (!dot) throw new Error('no circle rendered');
  return dot;
};

/** The pop run out (hintuan-pin.css, hintuan-label.css): sizes are read through its scale. */
const settled = (root: HTMLElement) =>
  Promise.all(root.getAnimations({ subtree: true }).map((animation) => animation.finished));

/** The marker sits on its point: the circle's centre is the pin's, left of the map's middle. */
const expectOnThePoint = async (root: HTMLElement, pin: HTMLElement) => {
  await settled(root);
  const circle = circleOf(pin).getBoundingClientRect();
  const map = root.querySelector('.maplibregl-map')?.getBoundingClientRect();
  if (!map) throw new Error('no map rendered');
  await expect(circle.left + circle.width / 2).toBeCloseTo(
    map.left + map.width / 2 - EAST_OF_PIN * PX_PER_DEGREE,
    0,
  );
  await expect(circle.top + circle.height / 2).toBeCloseTo(map.top + map.height / 2, 0);
};

/** The picked hintuan as the ride's end: a white End pill before the name on red, the circle filled in the same red. */
export const End: Story = {
  play: async ({ canvasElement }) => {
    const pin = await pinOf(canvasElement);
    await expect(pin.dataset.marks).toBe('end');
    await expect(pin.dataset.livery).toBe('rose');
    await expect(partOf(pin, 'name').contains(partOf(pin, 'end'))).toBe(true);
    await expect(pin.querySelector('[data-part="start"]')).toBeNull();
    await expect(partOf(pin, 'words').textContent).toBe('Novaliches Terminal');
    await expect(getComputedStyle(circleOf(pin)).backgroundColor).toBe(
      wornBy('bg-card-red-surface'),
    );
    await expect(getComputedStyle(partOf(pin, 'name')).backgroundColor).toBe(
      wornBy('bg-card-red-surface'),
    );
    await expect(getComputedStyle(partOf(pin, 'label')).opacity).toBe('1');
    await expectOnThePoint(canvasElement, pin);
  },
};

/** The picked start: a white Start pill before the name on Head Route's green, the circle Start's green too. */
export const Start: Story = {
  args: { marks: 'start' },
  play: async ({ canvasElement }) => {
    const pin = await pinOf(canvasElement);
    await expect(pin.dataset.marks).toBe('start');
    await expect(partOf(pin, 'name').contains(partOf(pin, 'start'))).toBe(true);
    await expect(pin.querySelector('[data-part="end"]')).toBeNull();
    await expect(getComputedStyle(partOf(pin, 'name')).backgroundColor).toBe(
      wornBy('bg-map-hotspots-card-hintuan-surface'),
    );
    await expect(getComputedStyle(circleOf(pin)).backgroundColor).toBe(
      wornBy('bg-map-hotspots-card-hintuan-surface'),
    );
    await expectOnThePoint(canvasElement, pin);
  },
};

/** A train line's station picked as the end: End and the code in white segments of one red pill, the name in another. */
export const TrainStation: Story = {
  args: { label: 'Balintawak', code: 'GL03', livery: 'light-rail-way-one' },
  play: async ({ canvasElement }) => {
    const pin = await pinOf(canvasElement);
    await expect(pin.dataset.livery).toBe('light-rail-way-one');
    await expect(partOf(pin, 'code').textContent).toBe('GL03');
    // With a code the End sign leaves the name's pill for one of its own beside it.
    await expect(partOf(pin, 'name').contains(partOf(pin, 'end'))).toBe(false);
    await expect(partOf(pin, 'words').textContent).toBe('Balintawak');
    await expect(getComputedStyle(circleOf(pin)).backgroundColor).toBe(
      wornBy('bg-card-red-surface'),
    );
    await expectOnThePoint(canvasElement, pin);
  },
};

/** A jeepney's hintuan with a name longer than the marker allows: the label is at most 256 wide, cut short with an ellipsis. */
export const LongName: Story = {
  args: { label: 'Novaliches Public Market and Jeepney Terminal Southbound Loading Bay' },
  play: async ({ canvasElement }) => {
    const pin = await pinOf(canvasElement);
    await settled(canvasElement);
    await expect(partOf(pin, 'label').getBoundingClientRect().width).toBeLessThanOrEqual(256);
    const words = partOf(pin, 'words');
    await expect(words.scrollWidth).toBeGreaterThan(words.clientWidth);
    // The End sign stays whole, before the name.
    await expect(partOf(pin, 'end').textContent).toBe('End');
  },
};

/** No name given: the circle stands alone. */
export const CircleAlone: Story = {
  args: { label: null },
  play: async ({ canvasElement }) => {
    const pin = await pinOf(canvasElement);
    await expect(pin.querySelector('[data-part="hintuan-name"]')).toBeNull();
    await expect(circleOf(pin)).toBeInTheDocument();
    await expectOnThePoint(canvasElement, pin);
  },
};

/**
 * Given `onPick`, as the public map gives it: the name is a button, and it
 * says what the tap does, the station's code too, since the code is only on
 * the map. A tap lets the pick go.
 */
export const EndLetGo: Story = {
  args: {
    label: 'Balintawak',
    code: 'GL03',
    livery: 'light-rail-way-one',
    onPick: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const pin = await pinOf(canvasElement);
    const name = partOf(pin, 'hintuan-name');
    await expect(name.tagName).toBe('BUTTON');
    await expect(name).toHaveAttribute('aria-label', 'End, GL03 Balintawak: let it go');
    await userEvent.click(name);
    await expect(args.onPick).toHaveBeenCalledTimes(1);
  },
};

/** The picked start's name is a button too, and says Start. */
export const StartLetGo: Story = {
  args: { marks: 'start', onPick: fn() },
  play: async ({ canvasElement, args }) => {
    const pin = await pinOf(canvasElement);
    const name = partOf(pin, 'hintuan-name');
    await expect(name.tagName).toBe('BUTTON');
    await expect(name).toHaveAttribute('aria-label', 'Start, Novaliches Terminal: let it go');
    await userEvent.click(name);
    await expect(args.onPick).toHaveBeenCalledTimes(1);
  },
};
