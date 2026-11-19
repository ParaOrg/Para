import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { TripSignboards } from './trip-signboards';

/**
 * A plain labelled rectangle as an SVG data URI, standing in for an uploaded signboard so the
 * stories need no files. Not drawn like a real board on purpose.
 */
const board = (label: string, width = 120) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="40" viewBox="0 0 ${width} 40">` +
      `<rect width="${width}" height="40" fill="lightgray"/>` +
      `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14">${label}</text>` +
      '</svg>',
  );

/** The signboards' card above a trip's tiles, on a phone-wide sheet (BottomContent, 4796:30124). */
const meta = {
  title: 'Features/Routes/TripSignboards',
  component: TripSignboards,
  decorators: [
    (Story) => (
      <div className="w-98.25 bg-bg-surface p-4">
        <Story />
      </div>
    ),
  ],
  args: { signboards: [board('Board')] },
} satisfies Meta<typeof TripSignboards>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One signboard, 32 tall, under the "Signboard" heading. Its alt text reads "Signboard". */
export const OneSignboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Signboard' })).toBeVisible();
    const board = canvas.getByRole('img', { name: 'Signboard' });
    await waitFor(() => expect(board.getBoundingClientRect().height).toBe(32));
  },
};

/** None uploaded: no card at all. */
export const NoSignboards: Story = {
  args: { signboards: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId('trip-signboards')).toBeNull();
  },
};

/** Three signboards. Their alt text reads "Signboard 1 of 3" and so on. */
export const SeveralSignboards: Story = {
  args: { signboards: [board('Board 1'), board('Board 2', 160), board('Board 3', 96)] },
};

/** Eight signboards on a narrow phone, 320 wide, so they wrap onto more rows. */
export const ManySignboards: Story = {
  args: {
    signboards: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => board(`Board ${n}`, 96 + (n % 3) * 32)),
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};
