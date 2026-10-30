import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { RecordingCard } from './recording-card';
import { TrackingButton } from './tracking-button';

const meta = {
  title: 'Features/Contribute/RecordingCard',
  component: RecordingCard,
  args: { elapsedSeconds: 42, distanceM: 421, state: 'lakad', children: null },
  decorators: [
    (Story) => (
      <div className="w-[393px] bg-surface-quaternary p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecordingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const onClick = fn();

/** Recording on Lakad (4482:24179): Pause and the green Sakay. Under a minute and a kilometre. */
export const RecordingLakad: Story = {
  args: {
    children: (
      <>
        <TrackingButton variant="pause" corner="bottom-left" onClick={onClick} />
        <TrackingButton variant="sakay" corner="bottom-right" onClick={onClick} />
      </>
    ),
  },
};

/** Recording on Sakay (4482:24088): Pause and the blue Lakad. Minutes and kilometres. */
export const RecordingSakay: Story = {
  args: {
    state: 'sakay',
    elapsedSeconds: 42 * 60 + 10,
    distanceM: 4210,
    children: (
      <>
        <TrackingButton variant="pause" corner="bottom-left" onClick={onClick} />
        <TrackingButton variant="lakad" corner="bottom-right" onClick={onClick} />
      </>
    ),
  },
};

/** Paused (4482:24139): "--", the red dot, Resume and Finish. */
export const Paused: Story = {
  args: {
    state: 'paused',
    elapsedSeconds: 42 * 60,
    distanceM: 4210,
    children: (
      <>
        <TrackingButton variant="resume" corner="bottom-left" onClick={onClick} />
        <TrackingButton variant="finish" corner="bottom-right" onClick={onClick} />
      </>
    ),
  },
};

/** The longest figures a ride reaches: hours of minutes and a long distance still fit their thirds. */
export const LongFigures: Story = {
  args: {
    ...RecordingSakay.args,
    elapsedSeconds: 299 * 60,
    distanceM: 182_400,
  },
};

/** A recording just started: nothing yet. */
export const JustStarted: Story = {
  args: { ...RecordingLakad.args, elapsedSeconds: 0, distanceM: 0 },
};

/** A recording left open after a reload (unfinished-screen.tsx): paused, Resume and Stop. No frame of its own yet. */
export const LeftOpen: Story = {
  args: {
    state: 'paused',
    elapsedSeconds: 12 * 60,
    distanceM: 2300,
    children: (
      <>
        <TrackingButton variant="resume" corner="bottom-left" onClick={onClick} />
        <TrackingButton variant="stop" corner="bottom-right" onClick={onClick} />
      </>
    ),
  },
};
