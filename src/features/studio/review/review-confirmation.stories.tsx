import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ReviewConfirmation } from './review-confirmation';

const meta = {
  title: 'Features/Studio/ReviewConfirmation',
  component: ReviewConfirmation,
  parameters: { layout: 'padded' },
  args: {
    action: 'send-back',
    draft: {
      id: 'draft-a',
      label: 'UP Ikot',
      kind: 'route',
      status: 'pending',
      isNew: false,
      revision: 3,
      note: null,
      updatedAt: '2026-10-18T10:00:00Z',
    },
    isBusy: false,
    onCancel: fn(),
    onConfirm: fn(),
  },
} satisfies Meta<typeof ReviewConfirmation>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SendBack: Story = {};
export const Discard: Story = { args: { action: 'discard' } };
export const Submit: Story = {
  args: { action: 'submit', draft: { ...meta.args.draft, status: 'draft' } },
};
export const Busy: Story = { args: { isBusy: true } };
