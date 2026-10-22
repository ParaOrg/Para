import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { EndSign, SignCode } from './end-sign';

const meta = {
  title: 'Features/Routes/EndSign',
  component: EndSign,
  // The sign sits inside a pill of its end's colour; a plain one stands in for it here.
  decorators: [
    (Story, { args }) => (
      <div
        className={
          'flex w-fit items-center rounded-full p-1 font-sn-pro font-medium ' +
          (args.kind === 'start' ? 'bg-map-hotspots-card-hintuan-surface' : 'bg-card-red-surface')
        }
      >
        <Story />
      </div>
    ),
  ],
  args: { kind: 'start' },
} satisfies Meta<typeof EndSign>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Start: a white Badge reading "Start" in the green. */
export const Start: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Start')).toBeVisible();
  },
};

/** End: a white Badge reading "End" in the red. */
export const End: Story = { args: { kind: 'end' } };

/** The code at a train station: its own Badge, in a pill of its own (SignCode). */
export const Code: Story = {
  render: ({ kind }) => <SignCode kind={kind} code="YL06" />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('YL06')).toBeVisible();
  },
};
