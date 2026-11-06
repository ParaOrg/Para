import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { DraftSignboardsNotice } from './draft-signboards-notice';

const meta = {
  title: 'Features/Studio/DraftSignboardsNotice',
  component: DraftSignboardsNotice,
  // At the trip card's width, where the signboards go; `phone` at a handset's.
  decorators: [
    (Story, ctx) => (
      <div className={ctx.parameters.phone ? 'w-[390px] bg-surface' : 'w-[369px] bg-surface'}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: { state: 'loading' },
} satisfies Meta<typeof DraftSignboardsNotice>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {};
export const CouldNotRead: Story = { args: { state: 'error', onRetry: fn() } };
export const CouldNotReadPhone: Story = {
  args: { state: 'error', onRetry: fn() },
  parameters: { phone: true },
};
