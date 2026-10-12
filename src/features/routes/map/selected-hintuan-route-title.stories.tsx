import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { LIT_LINE, LIVERY_LINE } from './livery-line';
import { SelectedHintuanRouteTitle } from './selected-hintuan-route-title';

const meta = {
  title: 'Features/Routes/SelectedHintuanRouteTitle',
  component: SelectedHintuanRouteTitle,
  decorators: [
    (Story) => (
      // As the markers hold it (EndTitles, HintuanPin): 256 across at most, over the map.
      <div className="bg-surface-quaternary p-6">
        <div className="flex max-w-64 flex-col items-center">
          <Story />
        </div>
      </div>
    ),
  ],
  args: { name: 'North Caloocan City Hall' },
} satisfies Meta<typeof SelectedHintuanRouteTitle>;

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

/** The word a screen reader hears before the name, or none. */
const wordOf = (pill: HTMLElement) => pill.querySelector('.sr-only')?.textContent ?? 'none';

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
const pointerFill = (pill: HTMLElement) => {
  const pointer = pill.lastElementChild;
  if (!pointer || pointer.tagName !== 'svg') throw new Error('no pointer under the pill');
  return getComputedStyle(pointer).fill;
};

/** Default (3846:11748) as the frame draws it: the name alone, in the brand's blue, no word before it. */
export const Default: Story = {
  args: { variant: 'default' },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(iconOf(pill)).toBe('none');
    await expect(wordOf(pill)).toBe('none');
    await expect(getComputedStyle(pill).backgroundColor).toBe(wornBy('bg-brand-surface-secondary'));
    await expect(pill.querySelector('svg')).toBeNull();
  },
};

/** Default in what is lit: the selected blue a list's routes wear, from the map's own colours. */
export const DefaultLit: Story = {
  args: { variant: 'default', look: LIT_LINE },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(iconOf(pill)).toBe('none');
    await expect(pill).toHaveStyle({ backgroundColor: LIT_LINE.line, color: LIT_LINE.arrow });
  },
};

/** Default in a card's colour: a yellow route's words near-black, as its chevrons are. */
export const DefaultOnYellow: Story = {
  args: { variant: 'default', look: LIVERY_LINE.yellow },
  play: async ({ canvasElement }) => {
    await expect(pillOf(canvasElement)).toHaveStyle({
      backgroundColor: LIVERY_LINE.yellow.line,
      color: LIVERY_LINE.yellow.arrow,
    });
  },
};

/** Head Route (3848:12136): Start's circled S before the name, in the hintuan's green; Figma's sample name whole. */
export const HeadRoute: Story = {
  args: { variant: 'head' },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(iconOf(pill)).toBe('start');
    await expect(wordOf(pill)).toBe('Start, ');
    await expect(getComputedStyle(pill).backgroundColor).toBe(
      wornBy('bg-map-hotspots-card-hintuan-surface'),
    );
    const words = pill.querySelector('[data-part="words"]');
    await expect(words).not.toBeNull();
    await expect(words?.scrollWidth).toBe(words?.clientWidth);
  },
};

/** Tail Route (3881:6109): End's circled E before the name, in the brand's blue. */
export const TailRoute: Story = {
  args: { variant: 'tail' },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(iconOf(pill)).toBe('end');
    await expect(wordOf(pill)).toBe('End, ');
    await expect(getComputedStyle(pill).backgroundColor).toBe(wornBy('bg-brand-surface-secondary'));
  },
};

/** Figma's `knobb`: the pointer under the pill, at the circle it names, in the pill's colour. */
export const TailRouteWithPointer: Story = {
  args: { variant: 'tail', pointer: true },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(pointerFill(pill)).toBe(getComputedStyle(pill).backgroundColor);
  },
};

/** Head Route with the pointer, both in the hintuan's green. */
export const HeadRouteWithPointer: Story = {
  args: { variant: 'head', pointer: true },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(pointerFill(pill)).toBe(getComputedStyle(pill).backgroundColor);
    await expect(pointerFill(pill)).toBe(wornBy('bg-map-hotspots-card-hintuan-surface'));
  },
};

/** Default as the frame draws it, with the pointer: both in the brand's blue. */
export const DefaultWithPointer: Story = {
  args: { variant: 'default', pointer: true },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(pointerFill(pill)).toBe(getComputedStyle(pill).backgroundColor);
    await expect(pointerFill(pill)).toBe(wornBy('bg-brand-surface-secondary'));
  },
};

/** Default in what is lit, with the pointer: both in the line's colour, inline. */
export const DefaultLitWithPointer: Story = {
  args: { variant: 'default', look: LIT_LINE, pointer: true },
  play: async ({ canvasElement }) => {
    const pill = pillOf(canvasElement);
    await expect(pointerFill(pill)).toBe(getComputedStyle(pill).backgroundColor);
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
    await expect(pill.querySelector('[data-part="end"]')?.getBoundingClientRect().width).toBe(24);
  },
};
