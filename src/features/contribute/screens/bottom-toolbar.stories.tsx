import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { BottomToolbar } from './bottom-toolbar';

const meta = {
  title: 'Features/Contribute/BottomToolbar',
  component: BottomToolbar,
  args: { onOpenAccount: fn() },
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
