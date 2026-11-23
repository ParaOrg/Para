import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { FROST, type FrostCentre } from './frost-rings';
import { MapFrost } from './map-frost';

/** The stand-in map's size, as the decorator draws it (w-97.5 h-150). */
const MAP = { width: 390, height: 600 };

/** The rider's dot off the middle: up and to the left, as after a pan. */
const OFF_CENTRE: FrostCentre = { x: 110, y: 210, clearPx: FROST.clearMinPx, ...MAP };

const meta = {
  title: 'Features/Contribute/MapFrost',
  component: MapFrost,
  parameters: { layout: 'fullscreen' },
  // A stand-in for the map: streets, a route line and the rider's dot under the frost, and a card
  // over it.
  decorators: [
    (Story, { args }) => (
      <div className="relative h-150 w-97.5 overflow-hidden bg-surface-secondary">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-x-0 top-1/3 h-3 bg-neutral-300" />
          <div className="absolute inset-y-0 left-1/3 w-3 bg-neutral-300" />
          <div className="absolute inset-y-0 left-2/3 w-2 bg-neutral-300" />
          <div className="absolute top-1/4 left-1/4 h-1.5 w-1/2 rotate-12 rounded-full bg-card-red-surface" />
          <div
            className="absolute size-6 -translate-1/2 rounded-full border-4 border-surface bg-blue-700"
            // The dot stands where the frost clears: a place worked out at run time.
            style={{ left: args.centre.x, top: args.centre.y }}
          />
        </div>
        <Story />
        <p className="absolute inset-x-5 bottom-10 rounded-3xl bg-surface p-4 text-content-primary shadow-large">
          Paused · 12 min · 2.4 km
        </p>
      </div>
    ),
  ],
  args: { isFrosted: true, centre: OFF_CENTRE },
} satisfies Meta<typeof MapFrost>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Paused, the rider's dot off the middle: clear round the dot, blurrier step by step out to the
 * edges, the card over it crisp.
 */
export const Paused: Story = {
  args: { centre: OFF_CENTRE },
  play: async ({ canvasElement }) => {
    const layer = canvasElement.querySelector('[data-map-frost]');
    await expect(layer).not.toBeNull();
    await expect(layer?.getAttribute('data-frost-x')).toBe(String(OFF_CENTRE.x));
    await expect(canvasElement.querySelectorAll('[data-frost-ring]')).toHaveLength(
      FROST.levelsPx.length,
    );
    await expect(within(canvasElement).getByText(/Paused/)).toBeVisible();
  },
};

/** Paused with no fix yet: the frost clears round the map's middle. */
export const PausedNoFix: Story = {
  args: {
    centre: { x: MAP.width / 2, y: MAP.height / 2, clearPx: FROST.clearMinPx, ...MAP },
  },
};

/** Paused with a wide accuracy ring: clear as far as the ring. */
export const PausedWideRing: Story = {
  args: { centre: { ...OFF_CENTRE, clearPx: 140 } },
};

/** Recording: clear, the layer not painted. */
export const Recording: Story = { args: { isFrosted: false, centre: OFF_CENTRE } };
