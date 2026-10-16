import type { Meta, StoryObj } from '@storybook/react-vite';
import { Map as MapLibreMap } from 'maplibre-gl';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';

import type { LngLat } from '@/shared/utils/geo';

import type { Ride } from './direction-arrows';
import { EndTitles } from './end-titles';
import { CARD_SURFACE, CARD_SURFACE_PALE } from '../cards/livery-card';

import 'maplibre-gl/dist/maplibre-gl.css';

type EndTitlesProps = Omit<ComponentProps<typeof EndTitles>, 'map'>;

/**
 * The ends are DOM markers, so they need a real map to sit on. An empty
 * inline style stands in, so the story fetches no tiles (as BasemapControl's
 * do), and no line is drawn under them: the story is the ends alone.
 */
function OnAnEmptyMap(props: EndTitlesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const created = new MapLibreMap({
      container: containerRef.current,
      style: { version: 8, sources: {}, layers: [] },
      center: CENTRE,
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
      {map && <EndTitles {...props} map={map} />}
    </>
  );
}

const CENTRE: LngLat = [121.0539, 14.7489];
const ZOOM = 13.2;

/** Sample places only, a short ride east: Tala to Novaliches. Not read from anywhere. */
const TALA: LngLat = [121.0467, 14.7478];
const NOVALICHES: LngLat = [121.062, 14.75];
const FAIRVIEW: LngLat = [121.0594, 14.7433];

const talaToNovaliches: readonly LngLat[] = [
  TALA,
  [121.0518, 14.7482],
  [121.0572, 14.7496],
  NOVALICHES,
];

/** A hand-made ride, as useLitRides makes one from a lit direction. */
const rideOf = (over: Partial<Ride> = {}): Ride => ({
  id: 'tala-novaliches',
  line: talaToNovaliches,
  from: 'Tala',
  to: 'Novaliches',
  fromHotspot: 'tala',
  toHotspot: 'novaliches',
  ...over,
});

const meta = {
  title: 'Features/Routes/EndTitles',
  component: OnAnEmptyMap,
  // A phone-wide strip of map; the ends sit near its middle, their pills above the circles.
  decorators: [
    (Story) => (
      <div className="relative h-[240px] w-[390px] overflow-clip bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: { rides: [rideOf()], livery: 'rose' },
} satisfies Meta<typeof OnAnEmptyMap>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The ends' markers, once the map has put `count` of them there. */
const endsOf = async (root: HTMLElement, count: number): Promise<HTMLElement[]> => {
  let ends: HTMLElement[] = [];
  await waitFor(() => {
    ends = [...root.querySelectorAll<HTMLElement>('.end-title[data-end]')];
    expect(ends).toHaveLength(count);
  });
  return ends;
};

/** The end of that name and side. */
const endOf = (ends: readonly HTMLElement[], name: string, side: 'head' | 'tail'): HTMLElement => {
  const end = ends.find((e) => e.dataset.name === name && e.dataset.end === side);
  if (!end) throw new Error(`no ${side} named ${name} rendered`);
  return end;
};

/** A part of an end, by its data-part. */
const partOf = (end: HTMLElement, part: string): HTMLElement => {
  const el = end.querySelector<HTMLElement>(`[data-part="${part}"]`);
  if (!el) throw new Error(`no ${part} rendered`);
  return el;
};

/** Which icon leads a pill's name: start, end, or none. */
const iconOf = (end: HTMLElement) => {
  if (end.querySelector('[data-part="start"]')) return 'start';
  return end.querySelector('[data-part="end"]') ? 'end' : 'none';
};

/** The circle's colour: the TimelineDot inside its span. */
const circleColour = (end: HTMLElement) => {
  const dot = end.querySelector('[data-part="circle"] > span');
  if (!dot) throw new Error('no circle rendered');
  return getComputedStyle(dot).backgroundColor;
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

/** The pops run out (end-titles.css): sizes are read through their scale. */
const settled = (root: HTMLElement) =>
  Promise.all(root.getAnimations({ subtree: true }).map((animation) => animation.finished));

/** A named end's pill sits above its circle. */
const expectPillOverCircle = async (end: HTMLElement) => {
  const pill = partOf(end, 'name').getBoundingClientRect();
  const circle = partOf(end, 'circle').getBoundingClientRect();
  await expect(pill.bottom).toBeLessThan(circle.top);
};

/** Where a point falls on the map, in px from its top left: Web Mercator, 512 px a world at zoom 0. */
const projected = (at: LngLat, size: { width: number; height: number }) => {
  const world = 512 * 2 ** ZOOM;
  const x = (lng: number) => ((lng + 180) / 360) * world;
  const y = (lat: number) => {
    const rad = (lat * Math.PI) / 180;
    return (0.5 - Math.log(Math.tan(Math.PI / 4 + rad / 2)) / (2 * Math.PI)) * world;
  };
  return {
    x: size.width / 2 + x(at[0]) - x(CENTRE[0]),
    y: size.height / 2 + y(at[1]) - y(CENTRE[1]),
  };
};

/** The circle's centre is on the point: the marker is anchored at its foot, half a circle down. */
const expectCircleOn = async (root: HTMLElement, end: HTMLElement, at: LngLat) => {
  const map = root.querySelector('.maplibregl-map')?.getBoundingClientRect();
  if (!map) throw new Error('no map rendered');
  const circle = partOf(end, 'circle').getBoundingClientRect();
  const point = projected(at, map);
  await expect(circle.left + circle.width / 2 - map.left).toBeCloseTo(point.x, 0);
  await expect(circle.top + circle.height / 2 - map.top).toBeCloseTo(point.y, 0);
};

/** Both ends of a lit ride, marked: Start's S on the head in green, End's E on the tail in the line's colour. */
export const BothEnds: Story = {
  play: async ({ canvasElement }) => {
    const ends = await endsOf(canvasElement, 2);
    const head = endOf(ends, 'Tala', 'head');
    const tail = endOf(ends, 'Novaliches', 'tail');
    await settled(canvasElement);
    await expect(head.dataset.testid).toBe('end-title');
    await expect(tail.dataset.testid).toBe('end-title');
    await expect(iconOf(head)).toBe('start');
    await expect(iconOf(tail)).toBe('end');
    await expect(partOf(head, 'name').textContent).toBe('Start, Tala');
    await expect(partOf(tail, 'name').textContent).toBe('End, Novaliches');
    await expect(getComputedStyle(partOf(head, 'name')).backgroundColor).toBe(
      wornBy('bg-map-hotspots-card-hintuan-surface'),
    );
    await expect(getComputedStyle(partOf(tail, 'name')).backgroundColor).toBe(
      wornBy(CARD_SURFACE.rose),
    );
    await expect(getComputedStyle(partOf(head, 'name')).opacity).toBe('1');
    await expect(head).not.toHaveAttribute('data-paled');
    await expect(tail).not.toHaveAttribute('data-paled');
    // Both circles ringed in the card's colour, and neither takes a tap.
    await expect(circleColour(head)).toBe(wornBy(CARD_SURFACE.rose));
    await expect(circleColour(tail)).toBe(wornBy(CARD_SURFACE.rose));
    await expect(getComputedStyle(head).pointerEvents).toBe('none');
    await expectPillOverCircle(head);
    await expectPillOverCircle(tail);
    await expectCircleOn(canvasElement, head, TALA);
    await expectCircleOn(canvasElement, tail, NOVALICHES);
  },
};

/**
 * A ride picked backwards, its end tapped above its start on the trip
 * (`isBackwards`): the head, where the trip leaves, is the ride's E and
 * stays marked; the tail lies on the pale past the ride and loses its mark.
 */
export const RidePickedBackwards: Story = {
  args: {
    rides: [rideOf({ isBackwards: true, pale: [[talaToNovaliches[2], talaToNovaliches[3]]] })],
  },
  play: async ({ canvasElement }) => {
    const ends = await endsOf(canvasElement, 2);
    await settled(canvasElement);
    const head = endOf(ends, 'Tala', 'head');
    const tail = endOf(ends, 'Novaliches', 'tail');
    await expect(iconOf(head)).toBe('end');
    await expect(partOf(head, 'name').textContent).toBe('End, Tala');
    await expect(head).not.toHaveAttribute('data-paled');
    await expect(getComputedStyle(partOf(head, 'name')).opacity).toBe('1');
    await expect(iconOf(tail)).toBe('none');
    await expect(tail).toHaveAttribute('data-paled');
    await expect(getComputedStyle(partOf(tail, 'name')).opacity).toBe('0.6');
  },
};

/**
 * Given `onPick` and `onTrip`, as both apps give them, and a ride that says
 * its hotspots: the pills are buttons. The tail, which one ride alone goes
 * to, opens that ride's trip; the head opens its place's routes.
 */
export const PillsAsButtons: Story = {
  args: { onPick: fn(), onTrip: fn() },
  play: async ({ canvasElement, args }) => {
    const ends = await endsOf(canvasElement, 2);
    await settled(canvasElement);
    const tail = endOf(ends, 'Novaliches', 'tail');
    const head = endOf(ends, 'Tala', 'head');
    const tailButton = tail.querySelector('button');
    const headButton = head.querySelector('button');
    if (!tailButton || !headButton) throw new Error('no button rendered');
    await expect(tail).toHaveAttribute('data-opens', 'trip');
    await expect(tailButton).toHaveAttribute('aria-label', 'End, Novaliches: the trip there');
    await expect(head).toHaveAttribute('data-opens', 'place');
    await expect(headButton).toHaveAttribute('aria-label', 'Start, Tala: the routes there');
    // The button takes no taps itself, its pill does (end-titles.css): the tap lands on the pill.
    await userEvent.click(partOf(tail, 'name'));
    await expect(args.onTrip).toHaveBeenCalledWith('tala-novaliches');
    await userEvent.click(partOf(head, 'name'));
    await expect(args.onPick).toHaveBeenCalledWith('tala');
  },
};

/** The list's lines carry no card's colour: the circles and the tail's pill wear the selected blue. */
export const SelectedBlue: Story = {
  args: { livery: null },
  play: async ({ canvasElement }) => {
    const ends = await endsOf(canvasElement, 2);
    const blue = wornBy('bg-map-route-line-surface-selected');
    await expect(
      getComputedStyle(partOf(endOf(ends, 'Novaliches', 'tail'), 'name')).backgroundColor,
    ).toBe(blue);
    await expect(circleColour(endOf(ends, 'Tala', 'head'))).toBe(blue);
    await expect(circleColour(endOf(ends, 'Novaliches', 'tail'))).toBe(blue);
  },
};

/**
 * A ride cut short on its trip, both of the trip's ends outside it: the line
 * there is the card's pale (`pale`), so the circles ring in it and the pills
 * are the Label's Unselected, at 60%, with no S or E (the picks' pins carry
 * those).
 */
export const EndsOnThePale: Story = {
  args: {
    rides: [
      rideOf({
        pale: [
          [talaToNovaliches[0], talaToNovaliches[1]],
          [talaToNovaliches[2], talaToNovaliches[3]],
        ],
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const ends = await endsOf(canvasElement, 2);
    await settled(canvasElement);
    for (const end of [endOf(ends, 'Tala', 'head'), endOf(ends, 'Novaliches', 'tail')]) {
      await expect(end).toHaveAttribute('data-paled');
      await expect(iconOf(end)).toBe('none');
      await expect(getComputedStyle(partOf(end, 'name')).opacity).toBe('0.6');
      await expect(circleColour(end)).toBe(wornBy(CARD_SURFACE_PALE.rose));
      await expectPillOverCircle(end);
    }
    await expect(partOf(endOf(ends, 'Tala', 'head'), 'name').textContent).toBe('Tala');
  },
};

/**
 * A start picked alone, no ride yet (`isUnmarked`): the whole line is on the
 * pale, and both of the trip's ends lose their S and E, the start's pin the
 * one S.
 */
export const StartAlone: Story = {
  args: { rides: [rideOf({ isUnmarked: true, pale: [talaToNovaliches] })] },
  play: async ({ canvasElement }) => {
    const ends = await endsOf(canvasElement, 2);
    await settled(canvasElement);
    for (const end of [endOf(ends, 'Tala', 'head'), endOf(ends, 'Novaliches', 'tail')]) {
      await expect(end).toHaveAttribute('data-paled');
      await expect(iconOf(end)).toBe('none');
      await expect(getComputedStyle(partOf(end, 'name')).opacity).toBe('0.6');
      await expect(circleColour(end)).toBe(wornBy(CARD_SURFACE_PALE.rose));
    }
    await expect(canvasElement.querySelector('.sr-only')).toBeNull();
  },
};

/** A train ride: both ends are stations, named with their sign codes, each end's disc beside its pill. */
export const TrainRide: Story = {
  args: {
    livery: 'light-rail-way-one',
    rides: [
      rideOf({
        id: 'lrt-1',
        from: 'Roosevelt',
        to: 'Monumento',
        routeCode: 'LRT-1',
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const ends = await endsOf(canvasElement, 2);
    const head = endOf(ends, 'Roosevelt', 'head');
    const tail = endOf(ends, 'Monumento', 'tail');
    await settled(canvasElement);
    await expect(partOf(head, 'code').textContent).toBe('GL02');
    await expect(partOf(tail, 'code').textContent).toBe('GL04');
    await expect(iconOf(head)).toBe('start');
    await expect(iconOf(tail)).toBe('end');
    // With a code the S and the E leave the pill for a disc of their own, to its left.
    await expect(partOf(head, 'start').getBoundingClientRect().right).toBeLessThanOrEqual(
      partOf(head, 'name').getBoundingClientRect().left,
    );
    await expect(partOf(tail, 'end').getBoundingClientRect().right).toBeLessThanOrEqual(
      partOf(tail, 'name').getBoundingClientRect().left,
    );
    await expect(circleColour(tail)).toBe(wornBy(CARD_SURFACE['light-rail-way-one']));
  },
};

/**
 * Two lit rides leaving one place, Tala: it is named once, by the first ride
 * to reach it, and the other ride's start there keeps its circle, bare.
 */
export const TwoRidesSharingAnEnd: Story = {
  args: {
    rides: [
      rideOf(),
      rideOf({
        id: 'tala-fairview',
        line: [TALA, [121.0508, 14.7448], FAIRVIEW],
        to: 'SM Fairview',
      }),
    ],
  },
  play: async ({ canvasElement }) => {
    const ends = await endsOf(canvasElement, 4);
    await settled(canvasElement);
    // Three names for four ends; Tala's second is a circle with no pill.
    await expect(ends.filter((e) => e.dataset.testid === 'end-title')).toHaveLength(3);
    const talas = ends.filter((e) => e.dataset.name === 'Tala');
    await expect(talas).toHaveLength(2);
    await expect(talas.filter((e) => e.dataset.testid === 'end-title')).toHaveLength(1);
    const bare = talas.find((e) => e.dataset.testid === 'end-circle');
    await expect(bare?.querySelector('[data-part="name"]')).toBeNull();
    await expect(bare?.querySelector('[data-part="circle"]')).not.toBeNull();
    // Every end still has its circle.
    await expect(canvasElement.querySelectorAll('[data-part="circle"]')).toHaveLength(4);
    await expect(partOf(endOf(ends, 'SM Fairview', 'tail'), 'name').textContent).toBe(
      'End, SM Fairview',
    );
  },
};
