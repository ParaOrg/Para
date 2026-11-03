import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { RideList } from './ride-list';

const ride = (piece: number, lengthM: number) => ({
  piece,
  lengthM,
  line: [
    [121.06, 14.73],
    [121.07, 14.68],
  ] satisfies [number, number][],
});

const meta = {
  title: 'Features/Studio/RideList',
  component: RideList,
  args: { rides: [ride(1, 6200), ride(3, 2400)], onUse: fn(), onHighlight: fn() },
  decorators: [
    (Story) => (
      <div className="w-96 bg-surface p-4 font-sn-pro text-sm text-content-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RideList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Numbered in time order with their distances; focusing a ride's button highlights it on the map. */
export const TwoRides: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Ride 2 · 2.4 km')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Use this line: Ride 2' })).toBeVisible();
    await userEvent.tab();
    await expect(args.onHighlight).toHaveBeenCalledWith(1);
  },
};

export const ThreeRides: Story = {
  args: { rides: [ride(1, 6200), ride(3, 2400), ride(5, 900)] },
};
