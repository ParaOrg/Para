import type { Meta, StoryObj } from '@storybook/react-vite';

import { Skeleton } from './skeleton';

const meta = {
  title: 'Features/Contribute/Skeleton',
  component: Skeleton,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div className="w-80 rounded-3xl bg-surface p-4 shadow-large">
        <Story />
      </div>
    ),
  ],
  args: { className: 'h-6 w-32 rounded-full' },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A name's line, shimmering. */
export const Line: Story = {};

/** A tall block, as a card's picture. */
export const Block: Story = { args: { className: 'h-30 w-22.75 rounded-xl' } };

/** Before the wait is long enough to show: its room kept, nothing seen. */
export const NotYet: Story = { args: { isShown: false } };
