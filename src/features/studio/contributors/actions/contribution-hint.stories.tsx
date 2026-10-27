import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { ContributionHint } from './contribution-hint';

const meta = {
  title: 'Features/Studio/ContributionHint',
  component: ContributionHint,
  args: { onForget: fn() },
  decorators: [
    (Story) => (
      <div className="relative h-64 bg-neutral-200 font-sn-pro">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ContributionHint>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Direction: Story = {
  args: {
    start: {
      kind: 'direction',
      contributionId: 'c1',
      points: [],
      startName: 'SM Fairview',
      endName: 'Cubao',
    },
  },
};

export const DirectionWithoutNames: Story = {
  args: {
    start: { kind: 'direction', contributionId: 'c1', points: [], startName: '', endName: '' },
  },
};

export const Hintuan: Story = { args: { start: { kind: 'hintuan', ring: [] } } };
