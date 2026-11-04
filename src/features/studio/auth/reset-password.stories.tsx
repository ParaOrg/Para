import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ResetPassword } from './reset-password';

/**
 * The open dialog, to query inside. Found, not got: it opens in an effect, which a built
 * Storybook runs only after the play has begun (install-prompt.stories.tsx).
 */
async function openDialog(canvasElement: HTMLElement) {
  return within(await within(canvasElement.ownerDocument.body).findByRole('dialog'));
}

/** Escape as the browser answers it: a scripted keypress is untrusted, so the play sends `cancel`. */
function pressEscape(canvasElement: HTMLElement) {
  canvasElement.ownerDocument
    .querySelector('dialog[open]')
    ?.dispatchEvent(new Event('cancel', { cancelable: true }));
}

const meta = {
  title: 'Features/Studio/ResetPassword',
  component: ResetPassword,
  // A modal dialog sits in the top layer, against the viewport, over a map-coloured page. A
  // Phone story sets the viewport (as InstallPrompt's do), not a box.
  decorators: [
    (Story) => (
      <div className="h-160 bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: { onDone: fn() },
} satisfies Meta<typeof ResetPassword>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Back from a reset link, signed in by it: choose the new password. Escape leaves it open:
 * keeping the old password is Skip for now, a choice made on purpose.
 */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = await openDialog(canvasElement);
    pressEscape(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await expect(args.onDone).not.toHaveBeenCalled();
  },
};

/** Skip for now keeps the old password and closes the dialog. */
export const Skipped: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      (await openDialog(canvasElement)).getByRole('button', { name: 'Skip for now' }),
    );
    await expect(args.onDone).toHaveBeenCalledOnce();
  },
};

/** The two passwords differ: refused before anything is sent, and the dialog stays. */
export const PasswordsDiffer: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = await openDialog(canvasElement);
    await userEvent.type(canvas.getByPlaceholderText('New password'), 'New-password-22');
    await userEvent.type(canvas.getByPlaceholderText('Confirm new password'), 'New-password-23');
    await userEvent.click(canvas.getByRole('button', { name: 'Save password' }));
    await expect(canvas.getByText('The two passwords do not match.')).toBeVisible();
    await expect(args.onDone).not.toHaveBeenCalled();
  },
};

/** A password without a number: refused before anything is sent, in the rule's own words. */
export const RuleBroken: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = await openDialog(canvasElement);
    await expect(canvas.getByPlaceholderText('New password')).toHaveAccessibleDescription(
      'At least 8 characters, with letters and numbers',
    );
    await userEvent.type(canvas.getByPlaceholderText('New password'), 'only-letters');
    await userEvent.type(canvas.getByPlaceholderText('Confirm new password'), 'only-letters');
    await userEvent.click(canvas.getByRole('button', { name: 'Save password' }));
    await expect(
      canvas.getByText('Use at least 8 characters, with letters and numbers'),
    ).toBeVisible();
    await expect(args.onDone).not.toHaveBeenCalled();
  },
};

/** Back from an invite: the account's first password, with no Skip. */
export const Invite: Story = {
  args: { isInvite: true },
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Set your password' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Skip for now' })).toBeNull();
  },
};

/** At phone width. */
export const Phone: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } };
