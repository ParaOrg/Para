import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { SignIn } from './sign-in';

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
  title: 'Features/Studio/SignIn',
  component: SignIn,
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
} satisfies Meta<typeof SignIn>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The studio's front door: nothing behind it to go back to, so the way out
 * is a link to the public map, not Cancel.
 */
export const FrontDoor: Story = {
  args: { title: 'Studio sign in' },
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Studio sign in' })).toBeVisible();
    await expect(canvas.getByRole('link', { name: 'Public map' })).toHaveAttribute('href', '/');
    await expect(canvas.queryByRole('button', { name: 'Cancel' })).toBeNull();
    // Nothing behind it to go back to: Escape leaves it open.
    pressEscape(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Studio sign in' })).toBeVisible();
  },
};

/** Asked for at Done in a test session, over the drawing: Cancel closes it. */
export const AsADialog: Story = {
  args: { onDismiss: fn() },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      (await openDialog(canvasElement)).getByRole('button', { name: 'Cancel' }),
    );
    await expect(args.onDismiss).toHaveBeenCalledOnce();
  },
};

/** Escape closes it, as Cancel does. */
export const EscapeCloses: Story = {
  args: { onDismiss: fn() },
  play: async ({ canvasElement, args }) => {
    await openDialog(canvasElement);
    pressEscape(canvasElement);
    await expect(args.onDismiss).toHaveBeenCalledOnce();
  },
};

/** Opened with a notice, such as why a reset link was refused: it shows as the error, under Password. */
export const WithANotice: Story = {
  args: {
    notice: 'That reset link has expired or was already used. Ask for a new one below.',
  },
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Email' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(canvas.getByLabelText('Password', { exact: true })).toHaveAccessibleDescription(
      'That reset link has expired or was already used. Ask for a new one below.',
    );
  },
};

/** Forgot password: the same card asks only for the email it will send the link to. */
export const ForgotPassword: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Forgot password' }));
    await expect(canvas.getByRole('heading', { name: 'Forgot password' })).toBeVisible();
    await expect(canvas.queryByLabelText('Password', { exact: true })).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Send reset link' })).toBeEnabled();
  },
};

/** Sign in, from Forgot password: back to signing in, the email still typed. */
export const RememberedIt: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await userEvent.type(canvas.getByRole('textbox', { name: 'Email' }), 'owner@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Forgot password' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));
    await expect(canvas.getByRole('heading', { name: 'Sign in to save' })).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: 'Email' })).toHaveValue('owner@example.com');
  },
};

/** A long heading and a long notice: the card grows, the buttons stay at its foot. */
export const LongContent: Story = {
  args: {
    title: 'Sign in to save Tala – SM Fairview via Quirino Highway and Regalado Avenue',
    notice:
      'This reset link was opened on a different device from the one that asked for it. ' +
      'Open it on the phone or computer you asked from, or ask for a new link here.',
    onDismiss: fn(),
  },
};

/** At phone width, the front door as a phone first opens the studio. */
export const Phone: Story = {
  args: { title: 'Studio sign in' },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
