import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { PermissionPanel } from './permission-panel';

const meta = {
  title: 'Features/Contribute/PermissionPanel',
  component: PermissionPanel,
  args: { permission: 'notifications', onContinue: fn(), onCancel: fn() },
  decorators: [
    (Story) => (
      <div className="w-[390px] bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PermissionPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The first of three: why ParaPo asks to show the recording notice (Android 13 and up). */
export const Notifications: Story = {};

export const Location: Story = { args: { permission: 'location' } };

/** The long one: Android sends the contributor to Settings to choose “Allow all the time”. */
export const AllTheTime: Story = { args: { permission: 'backgroundLocation' } };
