import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ConsentPanel } from './consent-panel';

const meta = {
  title: 'Features/Contribute/ConsentPanel',
  component: ConsentPanel,
  args: { onAgree: fn(), onDecline: fn() },
  decorators: [
    (Story) => (
      <div className="relative h-[844px] w-[390px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ConsentPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** What is recorded, what for, who sees it, how long, where, deleting, who is responsible. */
export const Default: Story = {};

/** A short phone: the panel scrolls inside the screen instead of running off it. */
export const ShortPhone: Story = {
  decorators: [
    (Story) => (
      <div className="relative h-[560px] w-[360px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
};
