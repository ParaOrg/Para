import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

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

/** Published and unchanged (Figma 4614:15082): Exit and Unpublish, no saves. */
export const Published: Story = {
  args: { status: 'published', onUnpublish: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const names = canvas.getAllByRole('button').map((b) => b.textContent);
    await expect(names).toEqual(['Exit', 'Unpublish']);
    await userEvent.click(canvas.getByRole('button', { name: 'Unpublish' }));
    await expect(args.onUnpublish).toHaveBeenCalled();
  },
};

/** Unpublishing: its button says so, and nothing can be pressed twice. */
export const Unpublishing: Story = {
  args: { status: 'published', isUnpublishing: true, onUnpublish: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Unpublishing…' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Exit' })).toBeDisabled();
  },
};

/** A draft is stored (own or another editor's): Publish reads Approve. */
export const WithDraft: Story = {
  args: { hasDraft: true },
  play: async ({ canvasElement }) => {
    const names = within(canvasElement)
      .getAllByRole('button')
      .map((b) => b.textContent);
    await expect(names).toEqual(['Exit', 'Approve', 'Save as draft']);
  },
};

/** The editor's own draft: Discard beside Exit, asking nothing here (the panel asks). */
export const OwnDraft: Story = {
  args: { hasDraft: true, onDiscard: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const names = canvas.getAllByRole('button').map((b) => b.textContent);
    await expect(names).toEqual(['Exit', 'Discard', 'Approve', 'Save as draft']);
    await userEvent.click(canvas.getByRole('button', { name: 'Discard' }));
    await expect(args.onDiscard).toHaveBeenCalled();
  },
};

/** Approving the stored draft: Approve says so, and nothing can be pressed twice. */
export const Approving: Story = {
  args: { hasDraft: true, onDiscard: fn(), draftBusy: 'publish' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Approving…' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Discard' })).toBeDisabled();
  },
};

/** Discarding: Discard says so. */
export const Discarding: Story = {
  args: { hasDraft: true, onDiscard: fn(), draftBusy: 'discard' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('button', { name: 'Discarding…' })).toBeDisabled();
  },
};
