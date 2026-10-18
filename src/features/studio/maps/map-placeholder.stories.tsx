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
  args: { map: 'contributors', hasLine: false, onOpenPlayground: fn() },
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

/** With a line half drawn, which the placeholder says is waiting. */
export const WithLine: Story = { args: { hasLine: true } };

/** A phone's width; the placeholder fills the box it stands in. */
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};

export const Public: Story = { args: { map: 'public' } };
