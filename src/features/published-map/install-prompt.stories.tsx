import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { InstallPrompt } from './install-prompt';

const meta = {
  title: 'Features/PublishedMap/InstallPrompt',
  component: InstallPrompt,
  args: { onInstall: fn(), onLater: fn() },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof InstallPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Over the page, centred, at most 384 wide (3732:2512). On a phone, 16 in from each side. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog', {
      name: 'Welcome to Para Po',
    });
    await expect(dialog).toBeVisible();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Install' }));
    await expect(args.onInstall).toHaveBeenCalledOnce();
  },
};

/**
 * On a phone, the only place it shows: 16 in from each side. A modal dialog
 * sits against the viewport, not a container, so the story sets the viewport.
 */
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};

/** "I'll do it later", and Escape the same. */
export const Later: Story = {
  play: async ({ canvasElement, args }) => {
    const dialog = within(canvasElement.ownerDocument.body).getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'I’ll do it later' }));
    await expect(args.onLater).toHaveBeenCalledOnce();
    await userEvent.keyboard('{Escape}');
    await expect(args.onLater).toHaveBeenCalledTimes(2);
  },
};
