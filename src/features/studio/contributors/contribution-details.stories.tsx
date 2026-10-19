import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ContributionDetails } from './contribution-details';
import { STORY_CONTRIBUTIONS, STORY_DETAIL } from './contributor-story-data';

const [named, bare] = STORY_CONTRIBUTIONS;
if (!named || !bare) throw new Error('The stories need two uploads.');

const meta = {
  title: 'Features/Studio/ContributionDetails',
  component: ContributionDetails,
  args: {
    contribution: named,
    detail: STORY_DETAIL,
    isDetailLoading: false,
    detailError: null,
    onClose: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-96 bg-surface">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ContributionDetails>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The trail is still being read. */
export const ReadingTrail: Story = { args: { detail: undefined, isDetailLoading: true } };

export const TrailFailed: Story = {
  args: { detail: undefined, isDetailLoading: false, detailError: 'Failed to fetch' },
};

/** Nothing said about the ride: the fields say so. */
export const NothingSaid: Story = { args: { contribution: bare } };
