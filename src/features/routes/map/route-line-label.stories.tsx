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
    await expect(getComputedStyle(partOf(canvasElement, 'label')).opacity).toBe('1');
  },
};

/**
 * Unselected (4200:13645): Default at 60%, a hintuan outside the ride (the
 * owner's call).
 */
export const Unselected: Story = {
  args: { variant: 'unselected' },
  play: async ({ canvasElement }) => {
    const pill = partOf(canvasElement, 'name');
    await expectFigmaType(pill);
    await expect(getComputedStyle(pill).backgroundColor).toBe(wornBy('bg-card-rose-surface'));
    await expect(getComputedStyle(partOf(canvasElement, 'label')).opacity).toBe('0.6');
    await expect(canvasElement.querySelector('.sr-only')).toBeNull();
  },
};

/** End (4068:4865): End's circled E, 24 across, 2 in from the pill's edge, before the name. */
export const End: Story = {
  args: { variant: 'end' },
  play: async ({ canvasElement }) => {
    const pill = partOf(canvasElement, 'name');
    await expectFigmaType(pill);
    await expect(pill.contains(partOf(canvasElement, 'end'))).toBe(true);
    const icon = partOf(canvasElement, 'end').getBoundingClientRect();
    await expect(icon.width).toBe(24);
    await expect(icon.left - pill.getBoundingClientRect().left).toBe(2);
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

/**
 * Start: a ride's picked start, End's shape with Start's circled S in Head
 * Route's green, whatever the line (3848:12135; the owner's call: the start
 * pill, not the yellow).
 */
export const Start: Story = {
  args: { variant: 'start' },
  play: async ({ canvasElement }) => {
    const pill = partOf(canvasElement, 'name');
    await expectFigmaType(pill);
    await expect(getComputedStyle(pill).backgroundColor).toBe(
      wornBy('bg-map-hotspots-card-hintuan-surface'),
    );
    await expect(getComputedStyle(pill).color).toBe(wornBy('text-content-inverse', 'color'));
    await expect(pill.contains(partOf(canvasElement, 'start'))).toBe(true);
    await expect(canvasElement.querySelector('[data-part="end"]')).toBeNull();
    await expect(pill.querySelector('.sr-only')?.textContent).toBe('Start, ');
  },
};

/** CodeSignStart: a picked start station, the S in a green disc of its own, the code green on white. */
export const CodeSignStart: Story = {
  args: { variant: 'start', codeSign: 'YL07' },
  play: async ({ canvasElement }) => {
    const pill = partOf(canvasElement, 'name');
    const disc = partOf(canvasElement, 'start');
    const green = wornBy('bg-map-hotspots-card-hintuan-surface');
    await expect(pill.contains(disc)).toBe(false);
    await expect(disc.getBoundingClientRect().width).toBe(28);
    await expect(getComputedStyle(disc).backgroundColor).toBe(green);
    await expect(partOf(canvasElement, 'code').textContent).toBe('YL07');
    await expect(getComputedStyle(partOf(canvasElement, 'code')).color).toBe(green);
  },
};

/** Start on MRT-3's yellow line: green, never the line's yellow. */
export const CodeSignStartMetroRailWayThree: Story = {
  args: { variant: 'start', codeSign: 'YL07', livery: 'metro-rail-way-three' },
  play: async ({ canvasElement }) => {
    await expect(getComputedStyle(partOf(canvasElement, 'name')).backgroundColor).toBe(
      wornBy('bg-map-hotspots-card-hintuan-surface'),
    );
  },
};
export const StartOrange: Story = { args: { variant: 'start', livery: 'orange' } };
export const CodeSignStartLightRailWayOne: Story = {
  args: { variant: 'start', codeSign: 'GL05', livery: 'light-rail-way-one' },
};
export const CodeSignStartLightRailWayTwo: Story = {
  args: { variant: 'start', codeSign: 'PL05', livery: 'light-rail-way-two' },
};

/** A code given to Default draws nothing: Figma shows a station's code once it is picked. */
export const DefaultIgnoresCode: Story = {
  args: { variant: 'default', codeSign: 'YL06' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-part="code"]')).toBeNull();
  },
};

/** In each other card colour. */
export const CodeSignEndOrange: Story = {
  args: { variant: 'end', codeSign: 'PL08', livery: 'orange' },
};
export const CodeSignEndViolet: Story = {
  args: { variant: 'end', codeSign: 'YL13', livery: 'violet' },
};
export const CodeSignEndFuchsia: Story = {
  args: { variant: 'end', codeSign: 'YL06', livery: 'fuchsia' },
};
export const CodeSignEndPink: Story = {
  args: { variant: 'end', codeSign: 'GL05', livery: 'pink' },
};
export const CodeSignEndLightRailWayOne: Story = {
  args: { variant: 'end', codeSign: 'GL05', livery: 'light-rail-way-one' },
};
export const CodeSignEndLightRailWayTwo: Story = {
  args: { variant: 'end', codeSign: 'PL05', livery: 'light-rail-way-two' },
};
/**
 * MRT-3: its yellow pill and disc, the words and the E near-black
 * (Map/RouteLine/Arrow/Inverse, as its chevrons), and the code black on white
 * (Content/primary, the owner's call).
 */
export const CodeSignEndMetroRailWayThree: Story = {
  args: { variant: 'end', codeSign: 'YL05', livery: 'metro-rail-way-three' },
  play: async ({ canvasElement }) => {
    const pill = partOf(canvasElement, 'name');
    await expect(getComputedStyle(pill).backgroundColor).toBe(
      wornBy('bg-map-rail-metro-rail-way-three-surface'),
    );
    const dark = wornBy('text-map-route-line-arrow-inverse', 'color');
    await expect(getComputedStyle(partOf(canvasElement, 'words')).color).toBe(dark);
    await expect(getComputedStyle(partOf(canvasElement, 'end')).color).toBe(dark);
    await expect(getComputedStyle(partOf(canvasElement, 'code')).color).toBe(
      wornBy('text-content-primary', 'color'),
    );
  },
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
