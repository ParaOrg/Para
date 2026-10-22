import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { LngLat, Segment } from '@/shared/utils/geo';

import { FollowChip, PointBar, PutBack } from './point-bar';
import type { Drawing } from './use-drawing';

/** Four points of a sample route, Tala to SM Fairview. */
const points: LngLat[] = [
  [121.043326, 14.742006],
  [121.04184, 14.742003],
  [121.0424, 14.741507],
  [121.0435, 14.7415],
];
const stretch = (snap: Segment['snap'], from: LngLat, to: LngLat): Segment => ({
  snap,
  coordinates: [from, to],
});
const segments: Segment[] = [
  stretch('snapped', points[0], points[1]),
  stretch('freehand', points[1], points[2]),
  stretch('snapped', points[2], points[3]),
];

/**
 * A drawing in memory, every part of it: sample data only. The bars are drawn
 * from what is passed and report their buttons through `fn()`.
 */
function drawing(state: Partial<Drawing> = {}): Drawing {
  return {
    drawing: true,
    controlPoints: points,
    segments,
    line: points,
    snapping: 0,
    unresolved: false,
    freehand: false,
    setFreehand: fn(),
    target: { routeId: null, directionId: null },
    area: null,
    borrow: null,
    picking: null,
    startExtend: fn(),
    keep: fn(),
    joinGate: fn(),
    connect: fn(),
    lineNow: fn(() => points),
    uTurns: [],
    load: fn(),
    metres: 480,
    start: fn(),
    startWithPoints: fn(),
    startArea: fn(),
    loadArea: fn(),
    adoptHotspot: fn(),
    cancel: fn(),
    undo: fn(),
    addPoint: fn(),
    insertPoint: fn(),
    deletePoint: fn(),
    toggleSegment: fn(() => Promise.resolve()),
    selected: null,
    select: fn(),
    deleteSelected: fn(),
    canPutBack: false,
    putBack: fn(),
    followOffer: null,
    takeFollowOffer: fn(),
    ...state,
  };
}

const meta = {
  title: 'Features/Studio/PointBar',
  component: PointBar,
  // Over the map, where the draw toolbar stacks it. The `phone` parameter
  // gives it a handset's width, as card-actions.stories.tsx does.
  decorators: [
    (Story, ctx) => (
      <div
        className={
          ctx.parameters.phone
            ? 'flex w-[390px] flex-col items-center gap-2 bg-surface-quaternary p-4'
            : 'flex flex-col items-center gap-2 bg-surface-quaternary p-6'
        }
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: { draw: drawing({ selected: 1 }) },
} satisfies Meta<typeof PointBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A point in the middle: Delete, and the stretch on each side of it — the one
 * in follows the streets, so it offers Go straight; the one out is straight,
 * so it offers Follow streets.
 */
export const MiddlePoint: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Point 2 of 4')).toBeVisible();
    await expect(canvas.getByTestId('stretch-0')).toHaveTextContent('Go straight');
    await expect(canvas.getByTestId('stretch-1')).toHaveTextContent('Follow streets');
    await userEvent.click(canvas.getByTestId('stretch-1'));
    await expect(args.draw.toggleSegment).toHaveBeenCalledWith(1);
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));
    await expect(args.draw.deleteSelected).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.draw.select).toHaveBeenCalledWith(null);
  },
};

/** The first point: only the stretch out of it. */
export const FirstPoint: Story = {
  args: { draw: drawing({ selected: 0 }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByTestId('stretch--1')).toBeNull();
    await expect(canvas.getByTestId('stretch-0')).toBeVisible();
  },
};

/** The last point: only the stretch into it. */
export const LastPoint: Story = {
  args: { draw: drawing({ selected: 3 }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('stretch-2')).toBeVisible();
    await expect(canvas.queryByTestId('stretch-3')).toBeNull();
  },
};

/** A hotspot's corner, one of four: Delete, and no stretches — every edge is straight. */
export const HotspotCorner: Story = {
  args: { draw: drawing({ selected: 2, area: { kind: 'terminal', hotspotId: null } }) },
};

/** One of only three corners: it cannot go, and the bar says why instead of offering Delete. */
export const HotspotCornerKept: Story = {
  args: {
    draw: drawing({
      selected: 0,
      area: { kind: 'hintuan', hotspotId: null },
      controlPoints: points.slice(0, 3),
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('button', { name: 'Delete' })).toBeNull();
    await expect(canvas.getByText('A hotspot needs 3 corners')).toBeVisible();
  },
};

/** Nothing tapped: no bar at all. */
export const NothingSelected: Story = {
  args: { draw: drawing() },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId('point-bar')).toBeNull();
  },
};

/** A long route, a point late in it: the numbers grow, the bar keeps its width. */
export const LongRoute: Story = {
  args: {
    draw: drawing({
      selected: 46,
      controlPoints: Array.from({ length: 128 }, (_, i): LngLat => [121 + i / 1000, 14.74]),
      segments: Array.from({ length: 127 }, (_, i) =>
        stretch(i % 2 ? 'freehand' : 'snapped', [121 + i / 1000, 14.74], [121 + i / 1000, 14.74]),
      ),
    }),
  },
};

/** For a few seconds after Delete: the point back where it was. */
export const PutBackAfterDelete: Story = {
  args: { draw: drawing({ canPutBack: true }) },
  render: (args) => <PutBack {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Point deleted')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Put back' }));
    await expect(args.draw.putBack).toHaveBeenCalledOnce();
  },
};

/** The same, for a hotspot's corner. */
export const PutBackCorner: Story = {
  args: {
    draw: drawing({ canPutBack: true, area: { kind: 'terminal', hotspotId: null } }),
  },
  render: (args) => <PutBack {...args} />,
};

/** A finger tap landed on a saved line: the offer to follow it to its end. */
export const FollowOffer: Story = {
  args: {
    draw: drawing({
      followOffer: { ids: ['sample-out'], at: points[3], point: points[3] },
    }),
  },
  render: (args) => <FollowChip {...args} />,
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByTestId('follow-chip'));
    await expect(args.draw.takeFollowOffer).toHaveBeenCalledOnce();
  },
};

/** At phone width, the only place a finger brings it up. */
export const Phone: Story = { parameters: { phone: true } };
