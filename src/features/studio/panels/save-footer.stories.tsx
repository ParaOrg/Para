import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { SaveFooter } from './save-footer';

const meta = {
  title: 'Features/Studio/SaveFooter',
  component: SaveFooter,
  // At the sidebar's foot, 380 across (Figma 4300:20893).
  decorators: [
    (Story) => (
      <div className="flex w-95 flex-col bg-surface">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: { busyIntent: null, onExit: fn(), onPublish: fn() },
} satisfies Meta<typeof SaveFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Beside the map: Exit, Publish and Save as draft, as Figma draws them. */
export const Draft: Story = {
  play: async ({ canvasElement }) => {
    const names = within(canvasElement)
      .getAllByRole('button')
      .map((b) => b.textContent);
    await expect(names).toEqual(['Exit', 'Publish', 'Save as draft']);
  },
};

/** Publishing: its button says so, and nothing can be pressed twice. */
export const Publishing: Story = {
  args: { busyIntent: 'publish' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Publishing…' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Exit' })).toBeDisabled();
  },
};

/** Saving a draft: Save as draft says so. */
export const Saving: Story = {
  args: { busyIntent: 'draft' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Saving…' })).toBeDisabled();
  },
};

/** The line can't be saved yet: both saves wait, and say why on hover. */
export const Blocked: Story = {
  args: { saveBlocked: 'Add at least 2 points' },
  play: async ({ canvasElement }) => {
    const save = within(canvasElement).getByRole('button', { name: 'Save as draft' });
    await expect(save).toBeDisabled();
    await expect(save).toHaveAttribute('title', 'Add at least 2 points');
  },
};

/** Over the map on a phone: Back to map in Exit's place, since the line is kept. */
export const OverTheMap: Story = {
  args: { onExit: undefined, onCancel: fn() },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
