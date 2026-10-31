import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { BottomToolbar } from './bottom-toolbar';

const meta = {
  title: 'Features/Contribute/BottomToolbar',
  component: BottomToolbar,
  args: { onOpenRecord: fn(), onOpenAccount: fn() },
  decorators: [
    (Story) => (
      <div className="w-[393px] bg-surface-quaternary p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BottomToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Record, the screen showing, and Account (4486:25116). */
export const Default: Story = {};

/** On Account: Account marked, Record the way back to Start (4496:10482). */
export const OnAccount: Story = { args: { current: 'account' } };
