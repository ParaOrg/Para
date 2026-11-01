import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Coachmark } from './coachmark';

const FRAME = { width: 393, height: 852 };

/** Start tracking's place on Record: 32 in each side, near the foot. */
const START_TARGET = { left: 32, top: 708, width: 329, height: 48 };
/** Flag a stop's place: the top of the map's right-hand column. */
const FLAG_TARGET = { left: 329, top: 96, width: 44, height: 44 };

const meta = {
  title: 'Features/Contribute/Coachmark',
  component: Coachmark,
  parameters: { layout: 'fullscreen' },
  args: {
    target: START_TARGET,
    frame: FRAME,
    title: 'Start tracking',
    body: 'Tap here when you start your trip. Para keeps recording even with your screen off.',
    stepNumber: 1,
    stepCount: 7,
    onNext: fn(),
    onClose: fn(),
  },
  decorators: [
    (Story, { args }) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden bg-surface-secondary">
        {/* A stand-in for the control the step points at, where the page draws it. */}
        <div
          aria-hidden
          className="absolute rounded-full bg-brand-surface"
          style={{
            left: args.target.left,
            top: args.target.top,
            width: args.target.width,
            height: args.target.height,
          }}
        />
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Coachmark>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A control in the lower half: the card above it, its caret pointing down. */
export const Above: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Next' })).toHaveFocus();
    await userEvent.click(canvas.getByRole('button', { name: 'Skip' }));
    await expect(args.onClose).toHaveBeenCalled();
  },
};

/** A control in the upper half: the card under it, its caret pointing up. */
export const Below: Story = {
  args: {
    target: FLAG_TARGET,
    title: 'Flag a stop',
    body: 'Tap the flag where the vehicle stops to pick up or drop off passengers.',
    stepNumber: 3,
  },
};

/** The last step: Got it alone, which ends the tutorial. */
export const LastStep: Story = {
  args: {
    title: 'Finish and save',
    body: 'Arrived? Pause, then Finish, and add your start and end points so we can map your route.',
    stepNumber: 7,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('button', { name: 'Skip' })).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Got it' }));
    await expect(args.onClose).toHaveBeenCalled();
  },
};

/** Words longer than any step's: the card grows upward, away from its control. */
export const LongContent: Story = {
  args: {
    title: 'Lakad or Sakay, and what each of them records while you travel',
    body: 'You start on Lakad (walking). Tap Sakay when you board a jeep or bus, and Lakad again when you get off. Para keeps each part apart, so the walk to the stop and the ride itself are mapped as what they are.',
    stepNumber: 2,
  },
};
