import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ReviewStoryData } from './review-story-data';
import { ReviewSubjects } from './review-subjects';
const meta = {
  title: 'Features/Studio/ReviewSubjects',
  component: ReviewSubjects,
  args: { onChanged: fn(), onBusyChange: fn() },
  decorators: [
    (Story, context) => (
      <ReviewStoryData isEmpty={!!context.parameters.empty}>
        <Story />
      </ReviewStoryData>
    ),
  ],
} satisfies Meta<typeof ReviewSubjects>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Approved: Story = {};
export const Empty: Story = { parameters: { empty: true } };
