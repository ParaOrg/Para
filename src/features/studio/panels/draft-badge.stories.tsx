import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { DraftBadge } from './draft-badge';

const meta = {
  title: 'Features/Studio/DraftBadge',
  component: DraftBadge,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DraftBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Alone: the word says it, not only the colour. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Draft')).toBeVisible();
  },
};

/** Beside the sidebar's heading, as it stands there. */
export const BesideHeading: Story = {
  decorators: [
    (Story) => (
      <div className="flex w-95 items-center gap-2 bg-surface p-4 font-sn-pro">
        <h2 className="text-xl/7 font-semibold text-content-primary">Route Information</h2>
        <Story />
      </div>
    ),
  ],
};
