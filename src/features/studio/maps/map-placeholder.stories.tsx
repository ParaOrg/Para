import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { MapPlaceholder } from './map-placeholder';

const meta = {
  title: 'Features/Studio/MapPlaceholder',
  component: MapPlaceholder,
  decorators: [
    (Story) => (
      <div className="relative h-96 bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: { map: 'contributors', onOpenPlayground: fn() },
} satisfies Meta<typeof MapPlaceholder>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Contributors: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Back to the Playground' }),
    );
    await expect(args.onOpenPlayground).toHaveBeenCalledOnce();
  },
};

/** A phone's width. */
export const Phone: Story = {
  decorators: [
    (Story) => (
      <div className="w-[360px]">
        <Story />
      </div>
    ),
  ],
};

export const Public: Story = { args: { map: 'public' } };
