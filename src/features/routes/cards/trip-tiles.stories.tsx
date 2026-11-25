import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { FREE } from './trip-fare';
import { TripTiles } from './trip-tiles';

/**
 * A trip's tiles above its stops, on a phone-wide sheet, 16 in (BottomContent, 4821:40538). A tap
 * on the fare calls onTurn. The trip's card does the turning, so here the tile keeps the fare it
 * was given. Sample fares only.
 */
const meta = {
  title: 'Features/Routes/TripTiles',
  component: TripTiles,
  decorators: [
    (Story) => (
      <div className="w-98.25 bg-bg-surface px-4">
        <Story />
      </div>
    ),
  ],
  args: {
    shown: { regular: '₱23–24', discounted: '₱18–19' },
    shownMetres: 11_300,
    isDiscounted: false,
    turns: 0,
    onTurn: fn(),
    estimate: { low: 30, high: 60 },
    transportMode: 'Jeep',
  },
} satisfies Meta<typeof TripTiles>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Variants=Local, as a trip opens: the Regular fare and the Estimated Time Arrival over the
 * Transport mode and the Distance.
 */
export const Local: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const fare = canvas.getByTestId('trip-fare-turn');
    const time = canvas.getByTestId('trip-time');
    await expect(fare.getBoundingClientRect().right).toBeLessThanOrEqual(
      time.getBoundingClientRect().left,
    );
    await expect(canvas.getByTestId('trip-fare')).toHaveTextContent('₱23–24');
    await expect(time).toHaveTextContent('30 - 60mins');
    await expect(canvas.getByTestId('trip-mode')).toHaveTextContent('Jeep');
    await expect(canvas.getByTestId('trip-km')).toHaveTextContent('11.3km');
    await userEvent.click(fare);
    await expect(args.onTurn).toHaveBeenCalledTimes(1);
  },
};

/** Variants=Railway: the train's bound on its own row at the top, its line in full. */
export const Railway: Story = {
  args: { transportMode: 'LRT Line 1', bound: 'Southbound' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('trip-bound')).toHaveTextContent('Southbound');
  },
};

/** The Discounted fare for students, seniors and PWDs, which a tap on the fare shows. */
export const DiscountedFare: Story = { args: { isDiscounted: true } };

/** A ride nobody pays for, such as the ferry. The tile reads Free and has no fare to turn to. */
export const Free: Story = { args: { shown: FREE } };

/** No fare yet: the Estimated Time Arrival takes the top row. */
export const NoFareYet: Story = {
  args: { shown: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByTestId('trip-fare')).toBeNull();
    const tile = canvas.getByTestId('trip-time').parentElement?.parentElement;
    await expect(tile?.getBoundingClientRect().width).toBe(
      canvas.getByTestId('trip-tiles').getBoundingClientRect().width,
    );
  },
};

/** A mode with no vehicle drawn: no Transport mode or Estimated Time Arrival tile. */
export const NoRideFacts: Story = { args: { estimate: undefined, transportMode: undefined } };

/** A long ride, to see the figures at their widest. */
export const LongRide: Story = {
  args: { shownMetres: 128_400, estimate: { low: 180, high: 300 }, transportMode: 'UV Express' },
};

/** At a phone's width: 320 wide. */
export const Phone: Story = {
  args: { transportMode: 'LRT Line 1', bound: 'Southbound' },
  decorators: [
    (Story) => (
      <div className="@container w-80 bg-bg-surface px-4">
        <Story />
      </div>
    ),
  ],
};

/**
 * No fare rule and no vehicle drawn for the mode (a tricycle's): Distance alone, in the first
 * row's room. Figma draws nothing for it.
 */
export const DistanceOnly: Story = {
  args: { shown: undefined, estimate: undefined, transportMode: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId('trip-km')).toBeVisible();
    await expect(canvas.queryByTestId('trip-time')).toBeNull();
    await expect(canvas.queryByTestId('trip-mode')).toBeNull();
  },
};
