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

/** Past 99 the Indicator reads 99+; a screen reader still hears the count. */
export const PastNinetyNine: Story = {
  args: { count: 120 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('99+')).toBeVisible();
  },
};
