import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { FlagStopButton } from './flag-stop-button';

const meta = {
  title: 'Features/Contribute/FlagStopButton',
  component: FlagStopButton,
  decorators: [
    (Story) => (
      <div className="grid min-h-40 min-w-56 place-items-center bg-neutral-200 p-6">
        <Story />
      </div>
    ),
  ],
  args: { isRecording: true, canFlag: true, onFlag: fn() },
} satisfies Meta<typeof FlagStopButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Recording, on Lakad or Sakay: a tap flags the place, and "Flagged" shows beside it a moment. */
export const Default: Story = {};

/** Paused: shown, disabled, as the Paused frame draws it. */
export const Paused: Story = { args: { isRecording: false } };

/** The ride holds the most stops it can: the button stays, and a tap does nothing. */
export const AtTheLimit: Story = { args: { canFlag: false } };

/** Just tapped: "Flagged" beside the button for a moment (no Figma design for the note yet). */
export const JustFlagged: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Flag a stop' }));
    await expect(within(canvasElement).getByText('Flagged')).toBeVisible();
  },
};
