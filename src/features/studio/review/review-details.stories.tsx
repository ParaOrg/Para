import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ReviewDetails } from './review-details';
import {
  ReviewStoryData,
  STORY_DRAFT,
  STORY_REMOVAL,
  STORY_REMOVAL_DRAFT,
} from './review-story-data';
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
      <ReviewStoryData
        hasConflict={!!context.parameters.conflict}
        draft={context.args.draft}
        comparison={context.args.draft.id === STORY_REMOVAL_DRAFT.id ? STORY_REMOVAL : undefined}
      >
        <Story />
      </ReviewStoryData>
    ),
  ],
} satisfies Meta<typeof ReviewDetails>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Conflict: Story = { parameters: { conflict: true } };
export const WithNote: Story = {
  args: { draft: { ...STORY_DRAFT, status: 'draft', note: 'Check the loading point.' } },
};
export const RemovesAWay: Story = {
  args: { draft: STORY_REMOVAL_DRAFT, label: 'Fairview – Capitol' },
};
