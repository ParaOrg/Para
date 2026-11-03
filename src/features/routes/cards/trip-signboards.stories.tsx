import type { Meta, StoryObj } from '@storybook/react-vite';

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

/** The strip of signboards between a trip's card and its tiles, on a phone-wide sheet. */
const meta = {
  title: 'Features/Routes/TripSignboards',
  component: TripSignboards,
  decorators: [
    (Story) => (
      <div className="w-[393px] bg-surface pb-4">
        <Story />
      </div>
    ),
  ],
  args: { signboards: [board('Board')] },
} satisfies Meta<typeof TripSignboards>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One signboard. Its alt text reads "Signboard". */
export const OneSignboard: Story = {};

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
