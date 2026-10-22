import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { RouteLineEndingsLabel } from './route-line-endings-label';

const meta = {
  title: 'Features/Routes/RouteLineEndingsLabel',
  component: RouteLineEndingsLabel,
  decorators: [
    (Story) => (
      // As EndTitles holds it: 256 across at most, over the map, room for the pointer below.
      <div className="bg-surface-quaternary p-6 pb-8">
        <div className="flex max-w-64 flex-col items-center">
          <Story />
        </div>
      </div>
    ),
  ],
  args: { name: 'Label', livery: 'rose' },
} satisfies Meta<typeof RouteLineEndingsLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The pill the story renders. */
const pillOf = (root: HTMLElement): HTMLElement => {
  const pill = root.querySelector<HTMLElement>('[data-part="name"]');
  if (!pill) throw new Error('no pill rendered');
  return pill;
};

/** A part of the pill, by name; missing is a failure. */
const partOf = (root: HTMLElement, part: string): HTMLElement => {
  const el = root.querySelector<HTMLElement>(`[data-part="${part}"]`);
  if (!el) throw new Error(`no ${part} rendered`);
  return el;
};

/** The word segment's text: Start, End, or none. */
const signOf = (el: HTMLElement) =>
  el.querySelector('[data-part="start"]')?.textContent ??
  el.querySelector('[data-part="end"]')?.textContent ??
  'none';

/** The colour a token class paints, read off a probe wearing it. */
const wornBy = (className: string, property: 'backgroundColor' | 'color' = 'backgroundColor') => {
  const probe = document.createElement('i');
  probe.className = className;
  document.body.append(probe);
  const colour = getComputedStyle(probe)[property];
  probe.remove();
  return colour;
};

/** The pointer's fill, to hold against the pill's own colour. */
const knobbFill = (pill: HTMLElement) => {
  const knobb = pill.querySelector('[data-part="knobb"]');
  if (!knobb) throw new Error('no pointer under the pill');
  return getComputedStyle(knobb).fill;
};

/** Figma's text-sm/medium in SN Pro, 28 tall: never MapLibre's Helvetica Neue. */
const expectFigmaType = async (pill: HTMLElement) => {
  const style = getComputedStyle(pill);
  await expect(style.fontFamily).toMatch(/^"?SN Pro/);
  await expect(style.fontSize).toBe('14px');
  await expect(style.fontWeight).toBe('500');
  await expect(pill.getBoundingClientRect().height).toBe(28);
};

/** Head Route (3848:12136): a white "Start" pill before the name, on the hintuan's green. */
export const HeadRoute: Story = {
  args: { variant: 'head' },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expectFigmaType(pill);
    await expect(signOf(pill)).toBe('Start');
    await expect(getComputedStyle(pill).backgroundColor).toBe(
      wornBy('bg-map-hotspots-card-hintuan-surface'),
    );
    await expect(getComputedStyle(pill).color).toBe(wornBy('text-content-inverse', 'color'));
    await expect(knobbFill(pill)).toBe(getComputedStyle(pill).backgroundColor);
    const sign = partOf(pill, 'start');
    await expect(getComputedStyle(sign).backgroundColor).toBe(wornBy('bg-content-inverse'));
    await expect(getComputedStyle(sign).color).toBe(
      wornBy('text-map-hotspots-card-hintuan-surface', 'color'),
    );
    await expect(sign.getBoundingClientRect().left - pill.getBoundingClientRect().left).toBe(2);
  },
};

/** Head Route stays green on the list's blue lines, as on a card's colour. */
export const HeadRouteSelectedBlue: Story = {
  args: { variant: 'head', livery: null },
  play: async ({ canvasElement }) => {
    await expect(getComputedStyle(pillOf(canvasElement)).backgroundColor).toBe(
      wornBy('bg-map-hotspots-card-hintuan-surface'),
    );
  },
};

/** Tail Route (3881:6109): a white "End" pill before the name, on red whatever the line. */
export const TailRoute: Story = {
  args: { variant: 'tail' },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expectFigmaType(pill);
    await expect(signOf(pill)).toBe('End');
    await expect(getComputedStyle(pill).backgroundColor).toBe(wornBy('bg-card-red-surface'));
    await expect(knobbFill(pill)).toBe(getComputedStyle(pill).backgroundColor);
  },
};

/** Tail Route is red on the list's blue lines and on any card's colour: the line's colour is not worn. */
export const TailRouteSelectedBlue: Story = {
  args: { variant: 'tail', livery: null },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(getComputedStyle(pill).backgroundColor).toBe(wornBy('bg-card-red-surface'));
    await expect(knobbFill(pill)).toBe(getComputedStyle(pill).backgroundColor);
  },
};

/** Tail Route on a train line's colour, MRT-3's yellow included: still red, white words. */
export const TailRouteMetroRailWayThree: Story = {
  args: { variant: 'tail', livery: 'metro-rail-way-three' },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(getComputedStyle(pill).backgroundColor).toBe(wornBy('bg-card-red-surface'));
    await expect(getComputedStyle(pill).color).toBe(wornBy('text-content-inverse', 'color'));
  },
};

/** Default: the name alone in the line's colour, which Figma's set does not draw. */
export const Default: Story = {
  args: { variant: 'default' },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(signOf(pill)).toBe('none');
    await expect(getComputedStyle(pill).backgroundColor).toBe(wornBy('bg-card-rose-surface'));
    await expect(knobbFill(pill)).toBe(getComputedStyle(pill).backgroundColor);
  },
};

/** Default on the list's lines: the selected blue. */
export const DefaultSelectedBlue: Story = {
  args: { variant: 'default', livery: null },
  play: async ({ canvasElement }) => {
    await expect(getComputedStyle(pillOf(canvasElement)).backgroundColor).toBe(
      wornBy('bg-map-route-line-surface-selected'),
    );
  },
};

/** Unselected: Default at 60%, an end outside the ride (the Label's Unselected, 4200:13645). */
export const Unselected: Story = {
  args: { variant: 'unselected' },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(signOf(pill)).toBe('none');
    await expect(getComputedStyle(pill).opacity).toBe('0.6');
  },
};

/** Default on MRT-3's yellow: the words near-black, as its chevrons are. */
export const DefaultMetroRailWayThree: Story = {
  args: { variant: 'default', livery: 'metro-rail-way-three' },
  play: async ({ canvasElement }) => {
    await expect(getComputedStyle(pillOf(canvasElement)).color).toBe(
      wornBy('text-map-route-line-arrow-inverse', 'color'),
    );
  },
};

/** Head Route's Railway property (4307:26078): a train station's start, "Start" and its code in two white segments. */
export const HeadRouteRailway: Story = {
  args: { variant: 'head', codeSign: 'YL06', livery: 'metro-rail-way-three' },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expectFigmaType(pill);
    await expect(signOf(pill)).toBe('Start');
    const code = partOf(pill, 'code');
    await expect(code.textContent).toBe('YL06');
    await expect(getComputedStyle(pill).backgroundColor).toBe(
      wornBy('bg-map-hotspots-card-hintuan-surface'),
    );
    await expect(getComputedStyle(code).color).toBe(
      wornBy('text-map-hotspots-card-hintuan-surface', 'color'),
    );
    // 2 between the segments.
    const start = partOf(pill, 'start').getBoundingClientRect();
    await expect(code.getBoundingClientRect().left - start.right).toBe(2);
  },
};

/** Tail Route's Railway property (4307:26096): "End" and the code, red whatever the line. */
export const TailRouteRailway: Story = {
  args: { variant: 'tail', codeSign: 'GL02', livery: 'light-rail-way-one' },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(signOf(pill)).toBe('End');
    await expect(pill.querySelector('[data-part="code"]')?.textContent).toBe('GL02');
    await expect(getComputedStyle(pill).backgroundColor).toBe(wornBy('bg-card-red-surface'));
    await expect(knobbFill(pill)).toBe(getComputedStyle(pill).backgroundColor);
  },
};

/** Tail Route's Railway property on the list's lines: the same red. */
export const TailRouteRailwaySelectedBlue: Story = {
  args: { variant: 'tail', codeSign: 'PL08', livery: null },
  play: async ({ canvasElement }) => {
    await expect(getComputedStyle(pillOf(canvasElement)).backgroundColor).toBe(
      wornBy('bg-card-red-surface'),
    );
  },
};

/** A code given to Default draws nothing: Figma's Railway property is Head and Tail Route's alone. */
export const DefaultIgnoresCode: Story = {
  args: { variant: 'default', codeSign: 'YL06' },
  play: async ({ canvasElement }) => {
    await expect(pillOf(canvasElement).querySelector('[data-part="code"]')).toBeNull();
  },
};

/** An end outside the ride: Unselected leaves the code out too. */
export const UnselectedIgnoresCode: Story = {
  args: { variant: 'unselected', codeSign: 'YL06' },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(pill.querySelector('[data-part="code"]')).toBeNull();
    await expect(getComputedStyle(pill).opacity).toBe('0.6');
  },
};

/** A name longer than the marker: cut short with an ellipsis, the sign whole. */
export const LongName: Story = {
  args: { variant: 'tail', name: 'Bagong Silang Kanan 5 Phase 3 Package 2 Terminal' },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(pill.getBoundingClientRect().width).toBeLessThanOrEqual(256);
    const words = pill.querySelector('[data-part="words"]');
    await expect(words).not.toBeNull();
    await expect(words?.scrollWidth).toBeGreaterThan(words?.clientWidth ?? 0);
    await expect(signOf(pill)).toBe('End');
  },
};

/** A long station name with its code: the name cut short, the word and the code whole. */
export const LongNameRailway: Story = {
  args: {
    variant: 'tail',
    codeSign: 'YL06',
    name: 'North Caloocan City Hall Station Northbound Platform',
  },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(pill.getBoundingClientRect().width).toBeLessThanOrEqual(256);
    const words = pill.querySelector('[data-part="words"]');
    await expect(words).not.toBeNull();
    await expect(words?.scrollWidth).toBeGreaterThan(words?.clientWidth ?? 0);
    await expect(pill.querySelector('[data-part="code"]')?.textContent).toBe('YL06');
  },
};
