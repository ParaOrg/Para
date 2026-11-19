import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { FREE } from './trip-fare';
import { TripTiles } from './trip-tiles';

/**
 * The Fare and Distance tiles above a trip's stops, on a phone-wide sheet. A tap on the Fare tile
 * calls onTurn. The trip's card does the turning, so here the tile keeps the fare it was given.
 * Sample fares only.
 */
const meta = {
  title: 'Features/Routes/TripTiles',
  component: TripTiles,
  decorators: [
    (Story) => (
      <div className="w-98.25 bg-bg-surface p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    shown: { regular: '₱23–24', discounted: '₱18–19' },
    shownMetres: 9_400,
    isDiscounted: false,
    turns: 0,
    onTurn: fn(),
  },
} satisfies Meta<typeof TripTiles>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Regular fare, as a trip opens: the fare on the left, the distance on the right. */
export const RegularFare: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const fare = canvas.getByTestId('trip-fare-turn');
    const km = canvas.getByTestId('trip-km');
    await expect(fare.getBoundingClientRect().right).toBeLessThan(km.getBoundingClientRect().left);
    await expect(canvas.getByTestId('trip-fare')).toHaveTextContent('₱23–24');
    await userEvent.click(fare);
    await expect(args.onTurn).toHaveBeenCalledTimes(1);
  },
};

/** The Discounted fare for students, seniors and PWDs, which a tap on the Fare tile shows. */
export const DiscountedFare: Story = { args: { isDiscounted: true } };

/** A ride nobody pays for, such as the ferry. The tile reads Free and has no fare to turn to. */
export const Free: Story = { args: { shown: FREE } };

/** No fare yet, so the Distance tile takes the whole row. */
export const NoFareYet: Story = {
  args: { shown: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByTestId('trip-fare')).toBeNull();
    await expect(canvas.getByTestId('trip-km').parentElement?.getBoundingClientRect().width).toBe(
      canvas.getByTestId('trip-tiles').getBoundingClientRect().width,
    );
  },
};

/** A long ride, to see the Distance tile's figure at its widest. */
export const LongDistance: Story = { args: { shownMetres: 128_400 } };
