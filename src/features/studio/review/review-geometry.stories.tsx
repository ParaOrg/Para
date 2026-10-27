import type { Meta, StoryObj } from '@storybook/react-vite';

import { ReviewGeometry } from './review-geometry';
import { STORY_COMPARISON } from './review-story-data';
const meta = {
  title: 'Features/Studio/ReviewGeometry',
  component: ReviewGeometry,
  args: { comparison: STORY_COMPARISON },
} satisfies Meta<typeof ReviewGeometry>;
export default meta;
type Story = StoryObj<typeof meta>;
export const MovedPlace: Story = {};
export const NoDrawing: Story = {
  args: { comparison: { ...STORY_COMPARISON, approved: null, proposed: {} } },
};
