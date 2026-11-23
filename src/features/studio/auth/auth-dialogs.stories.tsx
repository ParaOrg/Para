import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { AuthDialogs } from './auth-dialogs';

/**
 * The open dialog, to query inside. Found, not got: it opens in an effect, which a built
 * Storybook runs only after the play has begun (install-prompt.stories.tsx).
 */
async function openDialog(canvasElement: HTMLElement) {
  return within(await within(canvasElement.ownerDocument.body).findByRole('dialog'));
}

const meta = {
  title: 'Features/Studio/AuthDialogs',
  component: AuthDialogs,
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
  args: {
    signingIn: false,
    onSignInDismiss: fn(),
    resetting: false,
    onResetDone: fn(),
    changingPasswordFor: null,
    onPasswordDone: fn(),
  },
} satisfies Meta<typeof AuthDialogs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No flag up, the usual case: nothing over the map. */
export const None: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement.ownerDocument.body).queryByRole('dialog')).toBeNull();
  },
};

/** Sign in, from the pill or asked for at Done: a dialog, so it has Cancel. */
export const SigningIn: Story = {
  args: { signingIn: true },
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Sign in to save' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Cancel' })).toBeVisible();
  },
};

/** Back from a reset link: choose a new password. */
export const Resetting: Story = {
  args: { resetting: true },
  play: async ({ canvasElement }) => {
    await expect(
      (await openDialog(canvasElement)).getByRole('heading', { name: 'Choose a new password' }),
    ).toBeVisible();
  },
};

/** Back from an invite: set the account's first password. */
export const Invited: Story = {
  args: { resetting: true, isInvite: true },
  play: async ({ canvasElement }) => {
    await expect(
      (await openDialog(canvasElement)).getByRole('heading', { name: 'Set your password' }),
    ).toBeVisible();
  },
};

/** From the pill's Password: change it, for the signed-in email. */
export const ChangingPassword: Story = {
  args: { changingPasswordFor: 'owner@example.com' },
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Change password' })).toBeVisible();
    await expect(canvas.getByText('Signed in as owner@example.com.')).toBeVisible();
  },
};

/** At phone width, signing in. */
export const Phone: Story = {
  args: { signingIn: true },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
