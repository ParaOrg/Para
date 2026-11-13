import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { StopNotesButton } from './stop-notes-button';

const meta = {
  title: 'Features/Contribute/StopNotesButton',
  component: StopNotesButton,
  args: { count: 1, onOpen: fn() },
  decorators: [
    (Story) => (
      <div className="grid min-h-40 min-w-56 place-items-center bg-surface-quaternary p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StopNotesButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** After the ride's first flag. */
export const OneStop: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Stops notes' }));
    await expect(args.onOpen).toHaveBeenCalledOnce();
  },
};

/** Figma's twelve (4718:3923): two figures in the Indicator. */
export const TwelveStops: Story = { args: { count: 12 } };

/** The most a ride holds, 200: three figures in the Indicator. Figma draws two at most. */
export const AtTheLimit: Story = { args: { count: 200 } };
