import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { GeneralBar } from './general-bar';

const meta = {
  title: 'Features/Contribute/GeneralBar',
  component: GeneralBar,
  args: { icon: 'settings', label: 'Account settings', hasChevron: true, onClick: fn() },
  decorators: [
    (Story) => (
      <div className="w-[353px] bg-surface p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GeneralBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A row that opens a screen: its icon, its words and the chevron (4513:22925). */
export const Default: Story = {};

/** Logout, in Content/error, with no chevron: it asks rather than opens a screen. */
export const Logout: Story = {
  args: { icon: 'logout', label: 'Logout', tone: 'error', hasChevron: false },
};
