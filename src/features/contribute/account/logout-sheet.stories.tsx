import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { LogoutSheet } from './logout-sheet';

const meta = {
  title: 'Features/Contribute/LogoutSheet',
  component: LogoutSheet,
  parameters: { layout: 'fullscreen' },
  args: { unsentCount: 0, isLoggingOut: false, onLogout: fn(), onCancel: fn() },
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden bg-surface">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LogoutSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every recording sent: the question alone. */
export const Default: Story = {};

/** One recording not sent yet. */
export const OneUnsent: Story = { args: { unsentCount: 1 } };

/** Several not sent yet: they stay behind on this phone. */
export const SeveralUnsent: Story = { args: { unsentCount: 4 } };

export const LoggingOut: Story = { args: { isLoggingOut: true } };
