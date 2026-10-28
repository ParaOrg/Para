import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { RefusedPanel } from './refused-panel';

const meta = {
  title: 'Features/Contribute/RefusedPanel',
  component: RefusedPanel,
  args: {
    permission: 'backgroundLocation',
    onOpenSettings: fn(),
    onRecordAnyway: fn(),
    onClose: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[390px] bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RefusedPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** “All the time” refused: recording still works with the screen on, so Record anyway is offered. */
export const AllTheTimeRefused: Story = {};

export const NotificationsRefused: Story = { args: { permission: 'notifications' } };

/** Without location nothing can be recorded, so the only way on is Settings. */
export const LocationRefused: Story = { args: { permission: 'location' } };
