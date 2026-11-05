import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import type { LngLat } from '@/shared/utils/geo';

import { DrawingHint } from './drawing-hint';
import type { Drawing } from '../drawing/use-drawing';

const POINTS: LngLat[] = [
  [121.043326, 14.742006],
  [121.04184, 14.742003],
  [121.0424, 14.741507],
];

/** Just what DrawingHint and CloseLoop read of a drawing: a stand-in, not a live one. */
function drawing(
  over: Partial<Pick<Drawing, 'moving' | 'controlPoints'>> & {
    uTurns?: number;
    isArea?: boolean;
  } = {},
): Drawing {
  const { uTurns = 0, isArea = false, ...rest } = over;
  return {
    controlPoints: POINTS,
    line: POINTS,
    segments: [],
    metres: 640,
    snapping: 0,
    moving: false,
    area: isArea ? { kind: 'hintuan', hotspotId: null } : null,
    uTurns: Array.from({ length: uTurns }, (_, i) => ({ point: i + 1, stub: [], metres: 60 })),
    addPoint: () => Promise.resolve(),
    ...rest,
  } as unknown as Drawing;
}

const meta = {
  title: 'Features/Studio/DrawingHint',
  component: DrawingHint,
  // At the sidebar's width, 348 inside its 16 each side. No phone specimen: it shows only beside
  // the map, on a computer; a phone keeps these on the drawing toolbar.
  decorators: [
    (Story) => (
      <div className="w-95 bg-surface p-4 font-sn-pro">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: { draw: drawing() },
} satisfies Meta<typeof DrawingHint>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A route drawn with a mouse: how to draw. */
export const Route: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('drawing-hint')).toBeVisible();
  },
};

/** In Move: a click selects and drags, and adds nothing. */
export const Moving: Story = {
  args: { draw: drawing({ moving: true }) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/^Move:/)).toBeVisible();
  },
};

/** A hotspot's outline: its corners. */
export const Hotspot: Story = {
  args: { draw: drawing({ isArea: true }) },
};

/** One U-turn: what it means, under the hint, said to a screen reader as it comes. */
export const OneUTurn: Story = {
  args: { draw: drawing({ uTurns: 1 }) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent(/turns back/);
  },
};

/** Several U-turns. */
export const UTurns: Story = {
  args: { draw: drawing({ uTurns: 3 }) },
};

/** A return trip drawn: Close the loop, ending it where papunta began. */
export const ReturnTrip: Story = {
  args: { loop: { closeAt: [121.0424, 14.741507], other: 'papunta' } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('close-loop')).toBeVisible();
  },
};

/** A return trip with no point yet: Close the loop waits, and says why. */
export const ReturnTripNotYet: Story = {
  args: {
    draw: drawing({ controlPoints: [] }),
    loop: { closeAt: [121.0424, 14.741507], other: 'papunta' },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('close-loop')).toBeDisabled();
  },
};

/** Everything at once: the hint, two U-turns and Close the loop. */
export const Everything: Story = {
  args: {
    draw: drawing({ uTurns: 2 }),
    loop: { closeAt: [121.0424, 14.741507], other: 'pabalik' },
  },
};
