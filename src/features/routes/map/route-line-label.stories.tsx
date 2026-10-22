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

/**
 * SN Pro Medium, 28 tall, never MapLibre's Helvetica Neue: a signed pill's name
 * Figma's text-base/Lower/medium, 16, an unsigned one's text-sm/medium, 14.
 */
const expectFigmaType = async (pill: HTMLElement) => {
  const style = getComputedStyle(pill);
  const isSigned = !!(pill.closest('[data-part="label"]') ?? pill).querySelector(
    '[data-part="start"], [data-part="end"]',
  );
  await expect(style.fontFamily).toMatch(/^"?SN Pro/);
  await expect(style.fontSize).toBe(isSigned ? '16px' : '14px');
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

/** End (4068:4865): a white "End" pill before the name, on red whatever the line. */
export const End: Story = {
  args: { variant: 'end' },
  play: async ({ canvasElement }) => {
    const pill = partOf(canvasElement, 'name');
    await expectFigmaType(pill);
    await expect(getComputedStyle(pill).backgroundColor).toBe(wornBy('bg-card-red-surface'));
    await expect(getComputedStyle(pill).color).toBe(wornBy('text-content-inverse', 'color'));
    const sign = partOf(canvasElement, 'end');
    await expect(pill.contains(sign)).toBe(true);
    await expect(sign.textContent).toBe('End');
    await expect(getComputedStyle(sign).backgroundColor).toBe(wornBy('bg-content-inverse'));
    await expect(getComputedStyle(sign).color).toBe(wornBy('text-card-red-surface', 'color'));
    await expect(sign.getBoundingClientRect().left - pill.getBoundingClientRect().left).toBe(2);
  },
};

/** End on a train line's colour, MRT-3's yellow included: still red. */
export const EndMetroRailWayThree: Story = {
  args: { variant: 'end', livery: 'metro-rail-way-three' },
  play: async ({ canvasElement }) => {
    await expect(getComputedStyle(partOf(canvasElement, 'name')).backgroundColor).toBe(
      wornBy('bg-card-red-surface'),
    );
  },
};

/**
 * CodeSignEnd (4068:4792): two red pills, 6 apart: "End" in one, the station's code and the
 * name in the other.
 */
export const CodeSignEnd: Story = {
  args: { variant: 'end', codeSign: 'YL06' },
  play: async ({ canvasElement }) => {
    const pill = partOf(canvasElement, 'name');
    const sign = partOf(canvasElement, 'end');
    const code = partOf(canvasElement, 'code');
    await expectFigmaType(pill);
    await expect(pill.contains(sign)).toBe(false);
    await expect(sign.textContent).toBe('End');
    await expect(code.textContent).toBe('YL06');
    const signPill = sign.parentElement;
    await expect(signPill?.getBoundingClientRect().height).toBe(28);
    await expect(
      pill.getBoundingClientRect().left - (signPill?.getBoundingClientRect().right ?? 0),
    ).toBe(6);
    await expect(getComputedStyle(code).backgroundColor).toBe(wornBy('bg-content-inverse'));
    await expect(pill.contains(code)).toBe(true);
    await expect(getComputedStyle(code).color).toBe(wornBy('text-card-red-surface', 'color'));
    await expect(getComputedStyle(pill).backgroundColor).toBe(wornBy('bg-card-red-surface'));
  },
};

/**
 * Start: a ride's picked start, End's shape with a white "Start" pill on Head Route's green,
 * whatever the line (3848:12135).
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
    await expect(partOf(canvasElement, 'start').textContent).toBe('Start');
    await expect(canvasElement.querySelector('[data-part="end"]')).toBeNull();
  },
};

/** CodeSignStart: a picked start station, "Start" in its own green pill, the code with the name. */
export const CodeSignStart: Story = {
  args: { variant: 'start', codeSign: 'YL07' },
  play: async ({ canvasElement }) => {
    const pill = partOf(canvasElement, 'name');
    const green = wornBy('bg-map-hotspots-card-hintuan-surface');
    await expect(pill.contains(partOf(canvasElement, 'start'))).toBe(false);
    await expect(getComputedStyle(pill).backgroundColor).toBe(green);
    await expect(partOf(canvasElement, 'code').textContent).toBe('YL07');
    await expect(getComputedStyle(partOf(canvasElement, 'code')).color).toBe(
      wornBy('text-map-hotspots-card-hintuan-surface', 'color'),
    );
  },
};

/** A code given to Default draws nothing: Figma shows a station's code once it is picked. */
export const DefaultIgnoresCode: Story = {
  args: { variant: 'default', codeSign: 'YL06' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-part="code"]')).toBeNull();
  },
};

/** A name longer than the marker: cut short with an ellipsis, the End pill whole. */
export const LongName: Story = {
  args: { variant: 'end', name: 'Bagong Silang Kanan 5 Phase 3 Package 2 Terminal' },
  play: async ({ canvasElement }) => {
    const pill = partOf(canvasElement, 'name');
    await expect(pill.getBoundingClientRect().width).toBeLessThanOrEqual(256);
    const words = partOf(canvasElement, 'words');
    await expect(words.scrollWidth).toBeGreaterThan(words.clientWidth);
    await expect(partOf(canvasElement, 'end').textContent).toBe('End');
  },
};
