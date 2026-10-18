import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ReviewDetails } from './review-details';
import { ReviewStoryData, STORY_DRAFT } from './review-story-data';
const meta = {
  title: 'Features/Studio/ReviewDetails',
  component: ReviewDetails,
  args: {
    draft: STORY_DRAFT,
    isBusy: false,
    onAction: fn(),
    onBack: fn(),
    onBusyChange: fn(),
    onReviewDependency: fn(),
  },
  decorators: [
    (Story, context) => (
      <ReviewStoryData hasConflict={!!context.parameters.conflict}>
        <Story />
      </ReviewStoryData>
    ),
  ],
} satisfies Meta<typeof ReviewDetails>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Pending: Story = {};
export const Conflict: Story = { parameters: { conflict: true } };
export const SentBack: Story = {
  args: { draft: { ...STORY_DRAFT, status: 'draft', note: 'Check the loading point.' } },
};
