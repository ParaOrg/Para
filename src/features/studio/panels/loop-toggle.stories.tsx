import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { LoopToggle } from './loop-toggle';

const meta = {
  title: 'Features/Studio/LoopToggle',
  component: LoopToggle,
  decorators: [
    (Story) => (
      <div className="w-md bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: { isLoop: false, isLocked: false, onChange: fn() },
} satisfies Meta<typeof LoopToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A line that was not closed: unticked, and ticking it asks for the change. */
export const Off: Story = {
  play: async ({ args, canvasElement }) => {
    const box = within(canvasElement).getByRole('checkbox', { name: /Ikot: goes round, no ends/ });
    await expect(box).not.toBeChecked();
    await userEvent.click(box);
    await expect(args.onChange).toHaveBeenCalledWith(true);
  },
};

/** A line closed on its own first point starts ticked. */
export const On: Story = {
  args: { isLoop: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('checkbox')).toBeChecked();
  },
};

/** Edit route, or a retried save: an ikot stays an ikot. */
export const Locked: Story = {
  args: { isLoop: true, isLocked: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('checkbox')).toBeDisabled();
  },
};
