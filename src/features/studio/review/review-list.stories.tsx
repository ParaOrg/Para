import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ReviewList } from './review-list';

const meta = {
  title: 'Features/Studio/ReviewList',
  component: ReviewList,
  parameters: { layout: 'padded' },
  args: {
    drafts: [
      {
        id: 'draft-a',
        label: 'UP Ikot',
        kind: 'route',
        status: 'draft',
        isNew: false,
        revision: 3,
        note: null,
        updatedAt: '2026-10-18T10:00:00Z',
      },
    ],
    isBusy: false,
    onAction: fn(),
    onReview: fn(),
  },
} satisfies Meta<typeof ReviewList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { drafts: [] } };
export const Busy: Story = { args: { isBusy: true } };
export const WithNote: Story = {
  args: {
    drafts: [
      {
        ...meta.args.drafts[0],
        note: 'Please check where the route passes Palma Hall.',
      },
    ],
  },
};
export const LongName: Story = {
  args: {
    drafts: [
      {
        ...meta.args.drafts[0],
        label: 'A long route name between Commonwealth Avenue, Fairview and the university campus',
      },
    ],
  },
};
