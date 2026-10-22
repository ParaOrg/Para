import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { EndSign } from './end-sign';

const meta = {
  title: 'Features/Routes/EndSign',
  component: EndSign,
  // The sign sits inside a pill of its end's colour; a plain one stands in for it here.
  decorators: [
    (Story, { args }) => (
      <div
        className={
          'flex w-fit items-center rounded-full p-0.5 font-sn-pro text-sm/5 font-medium ' +
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

/** Start: a white pill reading "Start" in the green. */
export const Start: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Start')).toBeVisible();
  },
};

/** End: a white pill reading "End" in the red. */
export const End: Story = { args: { kind: 'end' } };

/** At a train station: the word and the code in two white segments, 2 apart. */
export const WithCode: Story = {
  args: { kind: 'start', code: 'YL06' },
  play: async ({ canvasElement }) => {
    const card = within(canvasElement);
    await expect(card.getByText('Start')).toBeVisible();
    await expect(card.getByText('YL06')).toBeVisible();
  },
};

/** End with its code. */
export const EndWithCode: Story = { args: { kind: 'end', code: 'GL02' } };
