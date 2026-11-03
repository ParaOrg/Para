import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { FREE } from './trip-fare';
import { TripTiles } from './trip-tiles';

/**
 * The Distance and Fare tiles under a trip's card, on a phone-wide sheet. A tap on the Fare tile
 * calls onTurn. The trip's card does the turning, so here the tile keeps the fare it was given.
 * Sample fares only.
 */
const meta = {
  title: 'Features/Routes/TripTiles',
  component: TripTiles,
  decorators: [
    (Story) => (
      <div className="w-[393px] bg-surface">
        <Story />
      </div>
    ),
  ],
  args: {
    shown: { regular: '₱13', discounted: '₱10' },
    shownMetres: 9_400,
    isDiscounted: false,
    turns: 0,
    onTurn: fn(),
  },
} satisfies Meta<typeof TripTiles>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Regular fare, as a trip opens. */
export const RegularFare: Story = {};

/** The Discounted fare for students, seniors and PWDs, which a tap on the Fare tile shows. */
export const DiscountedFare: Story = { args: { isDiscounted: true } };

/** A ride nobody pays for, such as the ferry. The tile reads Free and has no fare to turn to. */
export const Free: Story = { args: { shown: FREE } };

/** No fare yet, so only the Distance tile shows. */
export const NoFareYet: Story = { args: { shown: undefined } };

/** A long ride, to see the Distance tile's figure at its widest. */
export const LongDistance: Story = { args: { shownMetres: 128_400 } };
