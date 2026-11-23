import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { LastKnownMark } from './last-known-mark';

const NOW = Date.UTC(2026, 10, 6, 6, 0, 0);
const MINUTE = 60_000;

const meta = {
  title: 'Features/Locator/LastKnownMark',
  component: LastKnownMark,
  args: { time: NOW - MINUTE, now: NOW },
  decorators: [
    (Story) => (
      <div className="grid size-40 place-items-center bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LastKnownMark>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Location just turned off: the place a minute ago, greyed out. */
export const OneMinuteAgo: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('1 min ago')).toBeVisible();
  },
};

/** Under a minute still says a minute: never "0 min ago". */
export const UnderAMinute: Story = { args: { time: NOW - 20_000 } };

/** Most of an hour. */
export const FortyFiveMinutesAgo: Story = { args: { time: NOW - 45 * MINUTE } };

/** From earlier in the day, read at the app's start. */
export const ThreeHoursAgo: Story = { args: { time: NOW - 3 * 60 * MINUTE } };

/** From an earlier day: the longest pill. */
export const TwelveDaysAgo: Story = { args: { time: NOW - 12 * 24 * 60 * MINUTE } };
