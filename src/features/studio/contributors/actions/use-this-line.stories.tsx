import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { UseThisLine } from './use-this-line';
import { STORY_CONTRIBUTIONS } from '../contributor-story-data';

const meta = {
  title: 'Features/Studio/UseThisLine',
  component: UseThisLine,
  args: { contribution: STORY_CONTRIBUTIONS[0], onStart: fn() },
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
