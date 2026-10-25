import type { Meta, StoryObj } from '@storybook/react-vite';

import { AppUpdateNotice } from './app-update-notice';

const meta = {
  title: 'Features/Contribute/AppUpdateNotice',
  component: AppUpdateNotice,
  args: {
    update: 'available',
    downloadUrl:
      'https://github.com/Roviicc/ParaPo/releases/latest/download/parapo-contributor.apk',
  },
  decorators: [
    (Story) => (
      <div className="w-[390px] bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AppUpdateNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A newer version exists: a quiet line above the Start bar. */
export const Available: Story = {};

/** Below the oldest version still allowed: this stands where the Start bar was. */
export const Required: Story = { args: { update: 'required' } };
