import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { StopRecordingScreen } from './stop-recording-screen';

const meta = {
  title: 'Features/Contribute/StopRecordingScreen',
  component: StopRecordingScreen,
  args: {
    figures: { elapsedSeconds: 42, distanceM: 2400 },
    onKeep: fn(),
    onStop: fn(),
  },
  // A phone over a map-coloured box, which the frosted screen blurs.
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden bg-surface-quaternary">
        <div className="absolute inset-x-10 top-40 h-60 rounded-full bg-brand-surface" />
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StopRecordingScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ✕ on a ride 2.4 km in (Figma 4501:19658): the ride paused under it. */
export const Default: Story = {};

/** ✕ at once: nothing recorded yet reads "0 m". */
export const NothingYet: Story = { args: { figures: { elapsedSeconds: 2, distanceM: 0 } } };

/** A long ride: minutes, and kilometres to one decimal. */
export const LongRide: Story = { args: { figures: { elapsedSeconds: 5400, distanceM: 42_195 } } };

/** A short phone, or one on its side: the whole screen scrolls, the paused figures last. */
export const ShortScreen: Story = {
  decorators: [
    (Story) => (
      <div className="relative h-[480px] w-[360px] overflow-hidden bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
};
