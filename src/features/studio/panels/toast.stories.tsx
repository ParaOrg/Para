import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Toast } from './toast';

const meta = {
  title: 'Features/Studio/Toast',
  component: Toast,
  decorators: [
    (Story) => (
      <div className="relative h-40 w-[28rem] bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
  args: { onDismiss: fn() },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

/** What a save or a problem says: announced as an alert. */
export const Alert: Story = {
  args: { children: 'Could not load the saved routes.' },
};
