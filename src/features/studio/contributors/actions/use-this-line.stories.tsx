import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { UseThisLine } from './use-this-line';
import {
  STORY_CONTRIBUTIONS,
  STORY_DETAIL,
  STORY_DETAIL_ALL_WALK,
  STORY_DETAIL_WALKED,
} from '../contributor-story-data';

const meta = {
  title: 'Features/Studio/UseThisLine',
  component: UseThisLine,
  args: { contribution: STORY_CONTRIBUTIONS[0], detail: STORY_DETAIL, onStart: fn() },
  decorators: [
    (Story) => (
      <div className="w-96 bg-surface p-4 font-sn-pro text-sm text-content-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UseThisLine>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pressing it hands the Playground the line's control points and the two names. */
export const WithLine: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Use this line' }));
    await expect(args.onStart).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'direction', startName: 'SM Fairview', endName: 'Cubao' }),
    );
  },
};

export const NoLine: Story = { args: { contribution: STORY_CONTRIBUTIONS[1] } };

/** Walking at both ends: the ride alone becomes the line, and the note says so. */
export const WithWalking: Story = {
  args: { detail: STORY_DETAIL_WALKED },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Walking is left out/)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Use this line' }));
    await expect(args.onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        points: [
          [121.06, 14.73],
          [121.07, 14.68],
          [121.05, 14.62],
        ],
      }),
    );
  },
};

export const AllWalking: Story = { args: { detail: STORY_DETAIL_ALL_WALK } };

/** The trail is still being read: nothing is offered yet. */
export const ReadingTrail: Story = { args: { detail: undefined } };
