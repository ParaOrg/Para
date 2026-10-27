import type { Meta, StoryObj } from '@storybook/react-vite';

import { DraftFactsForm } from './draft-facts-form';
import { ReviewStoryData, STORY_DRAFT } from './review-story-data';
const meta = {
  title: 'Features/Studio/DraftFactsForm',
  component: DraftFactsForm,
  args: { draft: { ...STORY_DRAFT, status: 'draft' } },
  decorators: [
    (Story) => (
      <ReviewStoryData>
        <Story />
      </ReviewStoryData>
    ),
  ],
} satisfies Meta<typeof DraftFactsForm>;
export default meta;
type Story = StoryObj<typeof meta>;
export const SentBackDetails: Story = {};
