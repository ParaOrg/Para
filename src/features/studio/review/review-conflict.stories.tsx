import type { Meta, StoryObj } from '@storybook/react-vite';

import { ReviewConflict } from './review-conflict';
import { ReviewStoryData, STORY_DRAFT } from './review-story-data';
const meta = {
  title: 'Features/Studio/ReviewConflict',
  component: ReviewConflict,
  args: { draft: STORY_DRAFT, currentRevision: 4 },
  decorators: [
    (Story) => (
      <ReviewStoryData>
        <Story />
      </ReviewStoryData>
    ),
  ],
} satisfies Meta<typeof ReviewConflict>;
export default meta;
type Story = StoryObj<typeof meta>;
export const NeedsExplicitChoice: Story = {};
