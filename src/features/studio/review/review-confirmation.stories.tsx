import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ReviewConfirmation } from './review-confirmation';

const meta = {
  title: 'Features/Studio/ReviewConfirmation',
  component: ReviewConfirmation,
  parameters: { layout: 'padded' },
  args: {
    action: 'approve',
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
export const Approve: Story = {};
export const Discard: Story = { args: { action: 'discard' } };
export const Busy: Story = { args: { isBusy: true } };
