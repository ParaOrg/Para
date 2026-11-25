import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Indicator } from './indicator';

const meta = {
  title: 'DesignSystem/Primitives/Indicator',
  component: Indicator,
  args: { count: 12 },
  decorators: [
    (Story) => (
      <div className="flex p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Indicator>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The set's own (4718:3920): 12, Content/inverse on Background/surface-inverse, 20 across. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const badge = within(canvasElement).getByText('12');
    const { width, height } = badge.getBoundingClientRect();
    await expect({ width, height }).toEqual({ width: 20, height: 20 });
  },
};

/** One: the filter's count with a mode picked. */
export const One: Story = { args: { count: 1 } };
