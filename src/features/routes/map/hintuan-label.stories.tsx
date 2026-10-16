import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { HintuanLabel } from './hintuan-label';

const meta = {
  title: 'Features/Routes/HintuanLabel',
  component: HintuanLabel,
  decorators: [
    (Story) => (
      // As its marker holds it: a box the dot sizes, the label hanging to its right.
      <div className="w-96 bg-surface-quaternary p-6">
        <div className="relative inline-flex">
          <Story />
        </div>
      </div>
    ),
  ],
  args: { name: 'Label', livery: 'rose' },
} satisfies Meta<typeof HintuanLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A part the story renders, by its data-part. */
const partOf = (root: HTMLElement, part: string): HTMLElement => {
  const el = root.querySelector<HTMLElement>(`[data-part="${part}"]`);
  if (!el) throw new Error(`no ${part} rendered`);
  return el;
};

/** The dot: the first thing in the box, as the markers' sheets find it. */
const dotOf = (root: HTMLElement): HTMLElement => {
  const dot = root.querySelector<HTMLElement>('.relative.inline-flex > span:first-child');
  if (!dot) throw new Error('no dot rendered');
  return dot;
};

/** The label's pop (hintuan-label.css) run out: sizes are read through its scale. */
const settled = (root: HTMLElement) =>
  Promise.all(root.getAnimations({ subtree: true }).map((animation) => animation.finished));

/** The label 8 right of the dot (Figma's spacing/2, 2026-10-16) and centred on it. */
const expectBesideTheDot = async (root: HTMLElement) => {
  const dot = dotOf(root).getBoundingClientRect();
  const label = partOf(root, 'label').getBoundingClientRect();
  await expect(label.left - dot.right).toBe(8);
  await expect(label.top + label.height / 2).toBe(dot.top + dot.height / 2);
};

/** Hintuan (4068:4790): a hintuan along the trip, its dot hollow at rest, its name in the line's colour. */
export const Hintuan: Story = {
  args: { variant: 'hintuan' },
  play: async ({ canvasElement }) => {
    await expectBesideTheDot(canvasElement);
    await expect(canvasElement.querySelector('[data-part="end"]')).toBeNull();
    // At rest the ring is thick and the centre white (TimelineDot): the picked one's is filled.
    await expect(getComputedStyle(dotOf(canvasElement)).paddingTop).toBe('6px');
  },
};

/** HintuanEnd (4068:4878): the picked hintuan, its dot filled, End's E before its name. */
export const HintuanEnd: Story = {
  args: { variant: 'hintuan-end' },
  play: async ({ canvasElement }) => {
    await expectBesideTheDot(canvasElement);
    await expect(partOf(canvasElement, 'name').contains(partOf(canvasElement, 'end'))).toBe(true);
    await expect(getComputedStyle(dotOf(canvasElement)).paddingTop).toBe('2px');
  },
};

/** CodeSign (4068:4792): a picked train station, the E in its own disc, the code in a white chip. */
export const CodeSign: Story = {
  args: { variant: 'hintuan-end', codeSign: 'YL06' },
  play: async ({ canvasElement }) => {
    await expectBesideTheDot(canvasElement);
    await expect(partOf(canvasElement, 'code').textContent).toBe('YL06');
  },
};

/**
 * HintuanStart: a ride's picked start, its dot filled, Start's S before its
 * name on Head Route's green (2026-10-16). Figma draws no HintuanStart:
 * HintuanEnd's shape in RouteLineEndingsLabels' start.
 */
export const HintuanStart: Story = {
  args: { variant: 'hintuan-start' },
  play: async ({ canvasElement }) => {
    await expectBesideTheDot(canvasElement);
    await expect(partOf(canvasElement, 'name').contains(partOf(canvasElement, 'start'))).toBe(true);
    await expect(getComputedStyle(dotOf(canvasElement)).paddingTop).toBe('2px');
  },
};

/** A picked start station: the S in its own green disc, the code in a white chip. */
export const CodeSignStart: Story = {
  args: { variant: 'hintuan-start', codeSign: 'YL07' },
  play: async ({ canvasElement }) => {
    await expectBesideTheDot(canvasElement);
    await expect(partOf(canvasElement, 'code').textContent).toBe('YL07');
  },
};

/** Along the rest past a picked hintuan: the dot rings in the card's pale, the name keeps the line's colour. */
export const Paled: Story = { args: { variant: 'hintuan', isPaled: true } };

/** Further out than the names show: the dot alone. */
export const DotAlone: Story = {
  args: { variant: 'hintuan', name: null },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-part="hintuan-name"]')).toBeNull();
  },
};

/** The picked one's name as a button, saying what the tap does. */
export const NameAsButton: Story = {
  args: { variant: 'hintuan-end', nameButtonLabel: 'End, Label: let it go' },
  play: async ({ canvasElement }) => {
    const name = partOf(canvasElement, 'hintuan-name');
    await expect(name.tagName).toBe('BUTTON');
    await expect(name.getAttribute('aria-label')).toBe('End, Label: let it go');
  },
};

/**
 * A name longer than its marker allows: the label hangs off a 24 px marker
 * at most 256 wide, cut short with an ellipsis, the disc and code whole.
 */
export const LongName: Story = {
  args: {
    variant: 'hintuan-end',
    codeSign: 'YL06',
    name: 'North Caloocan City Hall Station Northbound Platform',
  },
  play: async ({ canvasElement }) => {
    await settled(canvasElement);
    await expectBesideTheDot(canvasElement);
    await expect(partOf(canvasElement, 'label').getBoundingClientRect().width).toBeLessThanOrEqual(
      256,
    );
    const words = partOf(canvasElement, 'words');
    await expect(words.scrollWidth).toBeGreaterThan(words.clientWidth);
    await expect(partOf(canvasElement, 'end').getBoundingClientRect().width).toBe(28);
  },
};

/** A trip in each card colour. */
export const Red: Story = { args: { variant: 'hintuan-end', livery: 'red' } };
export const Orange: Story = { args: { variant: 'hintuan', livery: 'orange' } };
export const Violet: Story = { args: { variant: 'hintuan-end', livery: 'violet' } };
export const Fuchsia: Story = { args: { variant: 'hintuan', livery: 'fuchsia' } };
export const Pink: Story = { args: { variant: 'hintuan-end', livery: 'pink' } };
export const LightRailWayOne: Story = {
  args: { variant: 'hintuan-end', livery: 'light-rail-way-one' },
};
export const LightRailWayTwo: Story = {
  args: { variant: 'hintuan-end', livery: 'light-rail-way-two' },
};
export const MetroRailWayThree: Story = {
  args: { variant: 'hintuan-end', livery: 'metro-rail-way-three' },
};

/** A picked start on MRT-3: the dot the line's yellow, the label green (2026-10-16). */
export const MetroRailWayThreeStart: Story = {
  args: { variant: 'hintuan-start', codeSign: 'YL07', livery: 'metro-rail-way-three' },
};

/** A picked MRT-3 station: the code black on white (2026-10-16). */
export const MetroRailWayThreeCodeSign: Story = {
  args: { variant: 'hintuan-end', codeSign: 'YL05', livery: 'metro-rail-way-three' },
};
export const RedStart: Story = { args: { variant: 'hintuan-start', livery: 'red' } };

/** Along an MRT-3 trip: the dot ringed in its yellow, the name near-black on it (2026-10-13). */
export const MetroRailWayThreeHintuan: Story = {
  args: { variant: 'hintuan', livery: 'metro-rail-way-three' },
};

/** Past a picked MRT-3 station: the dot in the line's surface-pale, as the rest of the line. */
export const MetroRailWayThreePaled: Story = {
  args: { variant: 'hintuan', livery: 'metro-rail-way-three', isPaled: true },
};
