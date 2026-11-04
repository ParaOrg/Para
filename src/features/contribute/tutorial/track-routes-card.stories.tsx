import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { TrackRoutesCard } from './track-routes-card';

const meta = {
  title: 'Features/Contribute/TrackRoutesCard',
  component: TrackRoutesCard,
  args: { onTutorial: fn(), onLater: fn() },
  decorators: [
    (Story) => (
      <div className="w-[353px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TrackRoutesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The card at Figma's width: a 393 screen less 20 either side. */
export const Default: Story = {};

/** The narrowest phone: the words wrap in their column and the buttons stay equal. */
export const LongText: Story = {
  decorators: [
    (Story) => (
      <div className="w-[280px]">
        <Story />
      </div>
    ),
  ],
};

/** Later and Start Tutorial each call their own handler, once. */
export const ButtonsCallTheirHandlers: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Later' }));
    await expect(args.onLater).toHaveBeenCalledTimes(1);
    await expect(args.onTutorial).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'Start Tutorial' }));
    await expect(args.onTutorial).toHaveBeenCalledTimes(1);
  },
};
