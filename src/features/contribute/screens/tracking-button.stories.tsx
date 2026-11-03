import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { TrackingButton, type TrackingVariant } from './tracking-button';

const meta = {
  title: 'Features/Contribute/TrackingButton',
  component: TrackingButton,
  args: { variant: 'pause', onClick: fn() },
  decorators: [
    (Story) => (
      <div className="w-[393px] bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TrackingButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pause and Resume wear the brand surface (4482:24013, 4482:24031). */
export const Resume: Story = { args: { variant: 'resume' } };

export const Pause: Story = { args: { variant: 'pause' } };

/** A recording left open after a reload stops where it was: red, as an end is. */
export const Stop: Story = { args: { variant: 'stop' } };

/** Finish, the dark bar with the flag, while paused (4482:24032). */
export const Finish: Story = { args: { variant: 'finish' } };

/** The mode button names the mode a tap switches TO: green Sakay on Lakad, blue Lakad on Sakay. */
export const ModeSwitchToSakay: Story = { args: { variant: 'sakay' } };

export const ModeSwitchToLakad: Story = { args: { variant: 'lakad' } };

export const Pressed: Story = { args: { variant: 'pause', isActive: true } };

const PAIRS: [TrackingVariant, TrackingVariant][] = [
  ['pause', 'sakay'],
  ['pause', 'lakad'],
  ['resume', 'finish'],
  // A recording found open after a reload: no frame of its own yet.
  ['resume', 'stop'],
];

/** Two side by side at a card's foot, their outer corners rounded: the frames' three pairs, and the left-open one. */
export const Pairs: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      {PAIRS.map(([left, right]) => (
        <div key={`${left}-${right}`} className="flex">
          <TrackingButton variant={left} corner="bottom-left" />
          <TrackingButton variant={right} corner="bottom-right" />
        </div>
      ))}
    </div>
  ),
};

/** Disabled keeps its look; nothing here is disabled today, so the story only shows the button stays a real button. */
export const Disabled: Story = { args: { variant: 'finish', disabled: true } };
