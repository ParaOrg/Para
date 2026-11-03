import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { TripOtherRoutes } from './trip-other-routes';

/**
 * "Other routes" under a trip's tiles, on a phone-wide sheet. Each row is another route out of
 * where the trip starts, here Tala. Sample routes only.
 */
const meta = {
  title: 'Features/Routes/TripOtherRoutes',
  component: TripOtherRoutes,
  decorators: [
    (Story) => (
      <div className="w-[393px] bg-surface">
        <Story />
      </div>
    ),
  ],
  args: {
    routes: [
      { id: 'a', to: 'SM Fairview' },
      { id: 'b', to: 'Novaliches' },
      { id: 'c', to: 'Commonwealth' },
    ],
    onRoute: fn(),
  },
} satisfies Meta<typeof TripOtherRoutes>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three routes. A tap on a row passes that route's id to onRoute. */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Novaliches' }));
    await expect(args.onRoute).toHaveBeenCalledWith('b');
  },
};

/** One route, so its row is also the last. */
export const OneRoute: Story = { args: { routes: [{ id: 'a', to: 'SM Fairview' }] } };

/** A long place name. The row does not cut it. It wraps onto a second line. */
export const LongName: Story = {
  args: {
    routes: [
      { id: 'a', to: 'SM Fairview' },
      { id: 'b', to: 'Commonwealth Market, Commonwealth Avenue corner Tandang Sora Avenue' },
    ],
  },
};
