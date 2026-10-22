import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { HintoList } from './hinto-list';
import { STORY_DETAIL } from '../contributor-story-data';

const meta = {
  title: 'Features/Studio/HintoList',
  component: HintoList,
  args: { hintos: STORY_DETAIL.hintos, onStart: fn() },
  decorators: [
    (Story) => (
      <div className="w-96 bg-surface p-4 font-sn-pro text-sm text-content-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HintoList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pressing Draw a hintuan here starts a box around that hinto. */
export const OneHinto: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Draw a hintuan here' }),
    );
    await expect(args.onStart).toHaveBeenCalledWith(expect.objectContaining({ kind: 'hintuan' }));
  },
};

export const Several: Story = {
  args: {
    hintos: [
      ...STORY_DETAIL.hintos,
      { seq: 1, startedAt: 0, seconds: 95, at: [121.0711, 14.6702] },
      { seq: 2, startedAt: 0, seconds: 600, at: [121.0502, 14.6204] },
    ],
  },
};

export const None: Story = { args: { hintos: [] } };
