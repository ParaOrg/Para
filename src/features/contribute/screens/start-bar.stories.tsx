import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { StartBar } from './start-bar';

const meta = {
  title: 'Features/Contribute/StartBar',
  component: StartBar,
  args: { onClick: fn() },
  decorators: [
    (Story) => (
      // A stand-in for the map above it, so the rounded corners the bar draws on it show.
      <div className="flex h-60 w-[393px] flex-col justify-end bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StartBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Start Tracking (4485:24832), rounding the map's bottom corners into the brand's dark. */
export const Default: Story = {};
