import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ContributionList } from './contribution-list';
import { STORY_CONTRIBUTIONS } from './contributor-story-data';

const meta = {
  title: 'Features/Studio/ContributionList',
  component: ContributionList,
  args: { contributions: STORY_CONTRIBUTIONS, openedId: null, onOpen: fn() },
  decorators: [
    (Story) => (
      <div className="w-96 bg-surface">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ContributionList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Named uploads read by their places; one with nothing said reads by when it was recorded. */
export const Default: Story = {};

export const OneOpened: Story = { args: { openedId: STORY_CONTRIBUTIONS[0]?.id ?? null } };

export const LongNames: Story = {
  args: {
    contributions: STORY_CONTRIBUTIONS.map((c) => ({
      ...c,
      startName: 'Bagong Silang Kanan 5 Barangay Hall, beside the basketball court',
      endName: 'Quezon Memorial Circle, the jeepney stop under the footbridge',
    })),
  },
};
