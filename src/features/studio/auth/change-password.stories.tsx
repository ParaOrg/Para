import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ChangePassword } from './change-password';

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

/**
 * Fills the three fields and presses Save password. Callers pass passwords of
 * 8 characters or more, the form's own minimum, so the browser lets it submit.
 */
async function submitPasswords(
  canvas: ReturnType<typeof within>,
  current: string,
  next: string,
  confirm: string,
) {
  await userEvent.type(canvas.getByPlaceholderText('Current password'), current);
  await userEvent.type(canvas.getByPlaceholderText('New password'), next);
  await userEvent.type(canvas.getByPlaceholderText('Confirm new password'), confirm);
  await userEvent.click(canvas.getByRole('button', { name: 'Save password' }));
}

const meta = {
  title: 'Features/Studio/ChangePassword',
  component: ChangePassword,
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
  args: { email: 'owner@example.com', onDone: fn() },
} satisfies Meta<typeof ChangePassword>;

export default meta;
type Story = StoryObj<typeof meta>;

/** From the pill's Password: who is signed in, and the three fields. */
export const Default: Story = {};

/** Cancel closes it, nothing changed; Escape the same. */
export const Cancelled: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      (await openDialog(canvasElement)).getByRole('button', { name: 'Cancel' }),
    );
    await expect(args.onDone).toHaveBeenCalledOnce();
    pressEscape(canvasElement);
    await expect(args.onDone).toHaveBeenCalledTimes(2);
  },
};

/** The two new passwords differ: refused before anything is sent. */
export const NewPasswordsDiffer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await submitPasswords(canvas, 'Old-password-1', 'New-password-22', 'New-password-23');
    await expect(canvas.getByText('The two new passwords do not match.')).toBeVisible();
  },
};

/** The rule is said under the new password, and one without a number is refused before anything is sent. */
export const RuleBroken: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await expect(canvas.getByText('At least 8 characters, with letters and numbers')).toBeVisible();
    await submitPasswords(canvas, 'Old-password-1', 'only-letters', 'only-letters');
    await expect(
      canvas.getByText('Use at least 8 characters, with letters and numbers'),
    ).toBeVisible();
  },
};

/** The new password is the current one: refused before anything is sent. */
export const SameAsCurrent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await openDialog(canvasElement);
    await submitPasswords(canvas, 'Same-password-1', 'Same-password-1', 'Same-password-1');
    await expect(
      canvas.getByText('The new password is the same as the current one.'),
    ).toBeVisible();
  },
};

/** A long address: it wraps inside the card rather than running past it. */
export const LongEmail: Story = {
  args: { email: 'maria.clara.delos.santos-ibarra.transport.planning@quezoncity.example.gov.ph' },
};

/** At phone width. */
export const Phone: Story = { globals: { viewport: { value: 'mobile1', isRotated: false } } };
