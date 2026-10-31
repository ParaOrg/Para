import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { UseThisLine } from './use-this-line';
import {
  STORY_CONTRIBUTIONS,
  STORY_DETAIL,
  STORY_DETAIL_ALL_WALK,
  STORY_DETAIL_TWO_RIDES,
  STORY_DETAIL_WALKED,
} from '../contributor-story-data';

const meta = {
  title: 'Features/Studio/UseThisLine',
  component: UseThisLine,
  args: {
    contribution: STORY_CONTRIBUTIONS[0],
    detail: STORY_DETAIL,
    isDetailLoading: false,
    onStart: fn(),
    onHighlightRide: fn(),
  },
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

/** The ride's fixes are all too vague to place it: there is no ride line, only walking. */
export const NoRideLongEnough: Story = {
  args: {
    detail: {
      ...STORY_DETAIL_WALKED,
      trail: STORY_DETAIL_WALKED.trail.map((p, i) => (i === 2 ? { ...p, accuracyM: 120 } : p)),
      parts: [
        {
          mode: 'walk',
          from: STORY_DETAIL_WALKED.trail[0]?.time ?? 0,
          to: STORY_DETAIL_WALKED.trail[2]?.time ?? 0,
        },
        {
          mode: 'ride',
          from: STORY_DETAIL_WALKED.trail[2]?.time ?? 0,
          to: STORY_DETAIL_WALKED.trail[3]?.time ?? 0,
        },
        {
          mode: 'walk',
          from: STORY_DETAIL_WALKED.trail[3]?.time ?? 0,
          to: STORY_DETAIL_WALKED.trail[4]?.time ?? 0,
        },
      ],
    },
  },
};

/** The trail is still being read: nothing is offered yet. */
export const ReadingTrail: Story = { args: { detail: undefined, isDetailLoading: true } };

/** The trail could not be read: the parts are unknown, so the upload's own line is offered. */
export const TrailFailed: Story = {
  args: { detail: undefined, isDetailLoading: false },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: 'Use this line' }),
    ).toBeVisible();
  },
};

/** Two rides with a walk between: each is offered on its own, and copies its own line. */
export const TwoRides: Story = {
  args: { detail: STORY_DETAIL_TWO_RIDES },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('Walking is left out: each ride can be used on its own.'),
    ).toBeVisible();
    const buttons = canvas.getAllByRole('button', { name: 'Use this line' });
    await expect(buttons).toHaveLength(2);
    const second = buttons[1];
    if (!second) throw new Error('The second ride has no Use this line.');
    await userEvent.click(second);
    await expect(args.onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        points: [
          [121.05, 14.62],
          [121.04, 14.6],
        ],
      }),
    );
  },
};
