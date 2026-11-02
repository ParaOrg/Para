import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { MapFrost } from './map-frost';

const meta = {
  title: 'Features/Contribute/MapFrost',
  component: MapFrost,
  parameters: { layout: 'fullscreen' },
  // A stand-in for the map: streets and a route line under the frost, and a card over it.
  decorators: [
    (Story) => (
      <div className="relative h-150 w-97.5 overflow-hidden bg-surface-secondary">
        <div aria-hidden className="absolute inset-0">
          <div className="absolute inset-x-0 top-1/3 h-3 bg-neutral-300" />
          <div className="absolute inset-y-0 left-1/3 w-3 bg-neutral-300" />
          <div className="absolute inset-y-0 left-2/3 w-2 bg-neutral-300" />
          <div className="absolute top-1/4 left-1/4 h-1.5 w-1/2 rotate-12 rounded-full bg-card-red-surface" />
        </div>
        <Story />
        <p className="absolute inset-x-5 bottom-10 rounded-3xl bg-surface p-4 text-content-primary shadow-large">
          Paused · 12 min · 2.4 km
        </p>
      </div>
    ),
  ],
  args: { isFrosted: true },
} satisfies Meta<typeof MapFrost>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Paused: the map behind frosted, the card over it crisp. */
export const Paused: Story = {
  play: async ({ canvasElement }) => {
    const layer = canvasElement.querySelector('[data-map-frost]');
    await expect(layer).not.toBeNull();
    await expect(within(canvasElement).getByText(/Paused/)).toBeVisible();
  },
};

/** Recording: clear, the layer not painted. */
export const Recording: Story = { args: { isFrosted: false } };
