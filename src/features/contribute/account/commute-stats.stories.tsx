import type { Meta, StoryObj } from '@storybook/react-vite';

import { CommuteStats } from './commute-stats';

const meta = {
  title: 'Features/Contribute/CommuteStats',
  component: CommuteStats,
  args: {
    state: {
      kind: 'shown',
      numbers: { recordings: 6, seconds: 62 * 3600 + 900, distanceM: 421_300, walkM: 168_000 },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[393px] bg-surface px-5 py-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CommuteStats>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As the frame has it (4511:22712): each share said beside its word. */
export const Default: Story = {};

/** Placeholders until the first numbers come. */
export const Loading: Story = { args: { state: { kind: 'loading' } } };

/** No numbers to be had, offline with none kept: one short line. */
export const Offline: Story = {
  args: { state: { kind: 'failed', message: 'Your statistics show when you’re online.' } },
};

/** No recordings yet: zeros, and the bar empty and grey. */
export const NoRecordings: Story = {
  args: {
    state: { kind: 'shown', numbers: { recordings: 0, seconds: 0, distanceM: 0, walkM: 0 } },
  },
};

/** One recording, under an hour: Recording, and minutes. */
export const OneShortRecording: Story = {
  args: {
    state: {
      kind: 'shown',
      numbers: { recordings: 1, seconds: 1500, distanceM: 6_200, walkM: 800 },
    },
  },
};

/** A tiny share still shows, as a sliver. */
export const TinyShare: Story = {
  args: {
    state: {
      kind: 'shown',
      numbers: { recordings: 120, seconds: 1240 * 3600, distanceM: 1_240_000, walkM: 2_000 },
    },
  },
};
