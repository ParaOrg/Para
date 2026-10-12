import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { RouteLineLabel } from './route-line-label';

const meta = {
  title: 'Features/Routes/RouteLineLabel',
  component: RouteLineLabel,
  decorators: [
    (Story) => (
      // As HintuanLabel holds it: 256 across at most, over the map.
      <div className="bg-surface-quaternary p-6">
        <div className="flex max-w-64">
          <Story />
        </div>
      </div>
    ),
  ],
  args: { name: 'Label', livery: 'rose' },
} satisfies Meta<typeof RouteLineLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A part the story renders, by its data-part. */
const partOf = (root: HTMLElement, part: string): HTMLElement => {
  const el = root.querySelector<HTMLElement>(`[data-part="${part}"]`);
  if (!el) throw new Error(`no ${part} rendered`);
  return el;
};

/** The colour a token class paints, read off a probe wearing it. */
const wornBy = (className: string, property: 'backgroundColor' | 'color' = 'backgroundColor') => {
  const probe = document.createElement('i');
  probe.className = className;
  document.body.append(probe);
  const colour = getComputedStyle(probe)[property];
  probe.remove();
  return colour;
};

/** Figma's text-sm/medium in SN Pro, 28 tall: never MapLibre's Helvetica Neue. */
const expectFigmaType = async (pill: HTMLElement) => {
  const style = getComputedStyle(pill);
  await expect(style.fontFamily).toMatch(/^"?SN Pro/);
  await expect(style.fontSize).toBe('14px');
  await expect(style.fontWeight).toBe('500');
  await expect(pill.getBoundingClientRect().height).toBe(28);
};

/** Default (3846:11748): the name alone in the line's colour, a rose card's. */
export const Default: Story = {
  args: { variant: 'default' },
  play: async ({ canvasElement }) => {
    const pill = partOf(canvasElement, 'name');
    await expectFigmaType(pill);
    await expect(getComputedStyle(pill).backgroundColor).toBe(wornBy('bg-card-rose-surface'));
    await expect(canvasElement.querySelector('[data-part="end"]')).toBeNull();
    await expect(canvasElement.querySelector('.sr-only')).toBeNull();
  },
};

/** End (4068:4865): End's circled E, 20 across, before the name. */
export const End: Story = {
  args: { variant: 'end' },
  play: async ({ canvasElement }) => {
    const pill = partOf(canvasElement, 'name');
    await expectFigmaType(pill);
    await expect(pill.contains(partOf(canvasElement, 'end'))).toBe(true);
    await expect(partOf(canvasElement, 'end').getBoundingClientRect().width).toBe(20);
    await expect(pill.querySelector('.sr-only')?.textContent).toBe('End, ');
  },
};

/**
 * CodeSignEnd (4068:4800): the E in a 28 disc of its own, 8 before the pill;
 * in the pill, the station's code in a white chip, its words the line's colour.
 */
export const CodeSignEnd: Story = {
  args: { variant: 'end', codeSign: 'YL06' },
  play: async ({ canvasElement }) => {
    const pill = partOf(canvasElement, 'name');
    const disc = partOf(canvasElement, 'end');
    const code = partOf(canvasElement, 'code');
    await expectFigmaType(pill);
    await expect(pill.contains(disc)).toBe(false);
    await expect(disc.getBoundingClientRect().height).toBe(28);
    await expect(disc.getBoundingClientRect().width).toBe(28);
    await expect(pill.getBoundingClientRect().left - disc.getBoundingClientRect().right).toBe(8);
    await expect(code.textContent).toBe('YL06');
    await expect(getComputedStyle(code).backgroundColor).toBe(wornBy('bg-content-inverse'));
    await expect(getComputedStyle(code).color).toBe(wornBy('text-card-rose-surface', 'color'));
  },
};

/** A code given to Default draws nothing: Figma shows a station's code once it is picked. */
export const DefaultIgnoresCode: Story = {
  args: { variant: 'default', codeSign: 'YL06' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-part="code"]')).toBeNull();
  },
};

/** In each other card colour. */
export const CodeSignEndRed: Story = { args: { variant: 'end', codeSign: 'GL02', livery: 'red' } };
export const CodeSignEndOrange: Story = {
  args: { variant: 'end', codeSign: 'PL08', livery: 'orange' },
};
export const CodeSignEndViolet: Story = {
  args: { variant: 'end', codeSign: 'YL13', livery: 'violet' },
};
export const CodeSignEndFuchsia: Story = {
  args: { variant: 'end', codeSign: 'YL06', livery: 'fuchsia' },
};

/** A name longer than the room: cut short with an ellipsis, the disc and the code whole. */
export const LongName: Story = {
  args: {
    variant: 'end',
    codeSign: 'YL06',
    name: 'North Caloocan City Hall Station Northbound Platform',
  },
  play: async ({ canvasElement }) => {
    const root = partOf(canvasElement, 'label');
    await expect(root.getBoundingClientRect().width).toBeLessThanOrEqual(256);
    const words = partOf(canvasElement, 'words');
    await expect(words.scrollWidth).toBeGreaterThan(words.clientWidth);
    await expect(partOf(canvasElement, 'end').getBoundingClientRect().width).toBe(28);
    await expect(partOf(canvasElement, 'code').scrollWidth).toBe(
      partOf(canvasElement, 'code').clientWidth,
    );
  },
};
