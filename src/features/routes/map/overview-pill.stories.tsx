import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { OverviewPill } from './overview-pill';

/** The public map's Overview (4831:51294) on the map's grey, where it floats over a trip. */
const meta = {
  title: 'Features/Routes/OverviewPill',
  component: OverviewPill,
  args: { isShown: true, go: fn(), map: null },
  decorators: [
    (Story) => (
      <div className="flex bg-bg-surface-secondary p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OverviewPill>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The camera off the trip: a real button named "Overview"; pressed, it calls `go`. */
export const Shown: Story = {
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Overview' });
    await expect(button).toBeVisible();
    await userEvent.click(button);
    await expect(args.go).toHaveBeenCalled();
  },
};

/** At the overview: hidden, and out of the keyboard's way. */
export const Hidden: Story = {
  args: { isShown: false },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Overview' })).toBeNull();
  },
};

/** On a phone's map, 393 wide, at the bottom left over the trip's sheet (4831:51289). */
export const OnPhone: Story = {
  decorators: [
    (Story) => (
      <div className="@container relative h-60 w-98.25 overflow-hidden bg-bg-surface-secondary">
        <div className="absolute inset-x-0 bottom-0 h-24 rounded-t-3xl bg-bg-surface" />
        <div className="absolute bottom-27 left-4 flex">
          <Story />
        </div>
      </div>
    ),
  ],
};
