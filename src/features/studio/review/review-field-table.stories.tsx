import type { Meta, StoryObj } from '@storybook/react-vite';

import { ReviewFieldTable } from './review-field-table';
const meta = {
  title: 'Features/Studio/ReviewFieldTable',
  component: ReviewFieldTable,
  args: {
    fields: [
      {
        label: 'Place / Note',
        approved: 'Old loading point',
        proposed: 'New loading point',
        changed: true,
      },
      {
        label: 'Place / Ground name',
        approved: 'Palma Hall',
        proposed: 'Palma Hall',
        changed: false,
      },
    ],
  },
} satisfies Meta<typeof ReviewFieldTable>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ChangedAndUnchanged: Story = {};
