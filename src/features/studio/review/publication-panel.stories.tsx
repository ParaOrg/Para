import type { Meta, StoryObj } from '@storybook/react-vite';

import { PublicationPanel } from './publication-panel';
import { ReviewStoryData } from './review-story-data';
const meta = {
  title: 'Features/Studio/PublicationPanel',
  component: PublicationPanel,
  decorators: [
    (Story, context) => (
      <ReviewStoryData isEmpty={!!context.parameters.empty}>
        <Story />
      </ReviewStoryData>
    ),
  ],
} satisfies Meta<typeof PublicationPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Waiting: Story = {};
export const Empty: Story = { parameters: { empty: true } };
