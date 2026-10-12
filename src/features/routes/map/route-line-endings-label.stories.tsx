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

/** Which icon leads the name, by its part: start, end, or none. */
const iconOf = (el: HTMLElement) => {
  if (el.querySelector('[data-part="start"] svg')) return 'start';
  return el.querySelector('[data-part="end"] svg') ? 'end' : 'none';
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

/** Head Route (3848:12136): Start's circled S, 20 across, before the name, all in the hintuan's green. */
export const HeadRoute: Story = {
  args: { variant: 'head' },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expectFigmaType(pill);
    await expect(iconOf(pill)).toBe('start');
    await expect(pill.querySelector('.sr-only')?.textContent).toBe('Start, ');
    await expect(getComputedStyle(pill).backgroundColor).toBe(
      wornBy('bg-map-hotspots-card-hintuan-surface'),
    );
    await expect(knobbFill(pill)).toBe(getComputedStyle(pill).backgroundColor);
    await expect(pill.querySelector('[data-part="start"]')?.getBoundingClientRect().width).toBe(20);
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

/** Tail Route (3881:6109): End's circled E before the name, in the line's colour — a rose card's. */
export const TailRoute: Story = {
  args: { variant: 'tail' },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expectFigmaType(pill);
    await expect(iconOf(pill)).toBe('end');
    await expect(pill.querySelector('.sr-only')?.textContent).toBe('End, ');
    await expect(getComputedStyle(pill).backgroundColor).toBe(wornBy('bg-card-rose-surface'));
    await expect(knobbFill(pill)).toBe(getComputedStyle(pill).backgroundColor);
  },
};

/** Tail Route on a list's lines: the selected blue they are lit in, not the brand's. */
export const TailRouteSelectedBlue: Story = {
  args: { variant: 'tail', livery: null },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(getComputedStyle(pill).backgroundColor).toBe(
      wornBy('bg-map-route-line-surface-selected'),
    );
    await expect(knobbFill(pill)).toBe(getComputedStyle(pill).backgroundColor);
  },
};

/** Tail Route in each other card colour. */
export const TailRouteRed: Story = { args: { variant: 'tail', livery: 'red' } };
export const TailRouteOrange: Story = { args: { variant: 'tail', livery: 'orange' } };
export const TailRouteViolet: Story = { args: { variant: 'tail', livery: 'violet' } };
export const TailRouteFuchsia: Story = { args: { variant: 'tail', livery: 'fuchsia' } };

/** Default: a ride's own tail past a picked hintuan, the name alone in the line's colour. */
export const Default: Story = {
  args: { variant: 'default' },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expectFigmaType(pill);
    await expect(iconOf(pill)).toBe('none');
    await expect(pill.querySelector('.sr-only')).toBeNull();
    await expect(getComputedStyle(pill).backgroundColor).toBe(wornBy('bg-card-rose-surface'));
    await expect(knobbFill(pill)).toBe(getComputedStyle(pill).backgroundColor);
  },
};

/** A name longer than the marker: cut short with an ellipsis, the icon whole. */
export const LongName: Story = {
  args: { variant: 'tail', name: 'Bagong Silang Kanan 5 Phase 3 Package 2 Terminal' },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(pill.getBoundingClientRect().width).toBeLessThanOrEqual(256);
    const words = pill.querySelector('[data-part="words"]');
    await expect(words).not.toBeNull();
    await expect(words?.scrollWidth).toBeGreaterThan(words?.clientWidth ?? 0);
    await expect(pill.querySelector('[data-part="end"]')?.getBoundingClientRect().width).toBe(20);
  },
};
