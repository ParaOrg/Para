import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { DeleteAccountScreen } from './delete-account-screen';

const meta = {
  title: 'Features/Contribute/DeleteAccountScreen',
  component: DeleteAccountScreen,
  parameters: { layout: 'fullscreen' },
  args: { isDeleting: false, error: null, onAsked: fn(), onDelete: fn(), onBack: fn() },
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DeleteAccountScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma's second frame: Delete account (5), faded, counting down. */
export const CountingDown: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByRole('heading', { level: 1, name: 'Delete account' })).toHaveFocus(),
    );
    await expect(canvas.getByRole('button', { name: /^Delete account \(\d\)$/ })).toBeDisabled();
  },
};

/** Figma's third frame: the wait over, Delete account can be pressed, and it is said once. */
export const Ready: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(
      () => expect(canvas.getByRole('button', { name: 'Delete account' })).toBeEnabled(),
      {
        timeout: 7000,
      },
    );
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Delete account can be pressed now.',
    );
  },
};

/** Figma's fourth frame: the question over the frosted page, focus on "No, I change my mind". */
export const Asked: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /^Delete account/ });
    await waitFor(() => expect(button).toBeEnabled(), { timeout: 7000 });
    await userEvent.click(button);
    const question = within(
      canvas.getByRole('alertdialog', { name: 'Do you want to delete your account?' }),
    );
    await waitFor(() =>
      expect(question.getByRole('button', { name: 'No, I change my mind' })).toHaveFocus(),
    );
    await userEvent.click(question.getByRole('button', { name: 'Delete this account' }));
    await expect(args.onDelete).toHaveBeenCalledTimes(1);
  },
};

/** Deleting: the question says so, and nothing cancels it. */
export const Deleting: Story = {
  args: { isDeleting: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /^Delete account/ });
    await waitFor(() => expect(button).toBeEnabled(), { timeout: 7000 });
    await userEvent.click(button);
    const question = within(canvas.getByRole('alertdialog'));
    await expect(question.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    await expect(question.getByRole('button', { name: 'No, I change my mind' })).toBeDisabled();
  },
};

/** Delete account failed: the line shows in the open question. */
export const Failed: Story = {
  args: { error: 'No signal — try again when you’re online' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /^Delete account/ });
    await waitFor(() => expect(button).toBeEnabled(), { timeout: 7000 });
    await userEvent.click(button);
    await expect(within(canvas.getByRole('alertdialog')).getByText(/No signal/)).toBeVisible();
  },
};

/** A short, narrow phone: the page scrolls inside the screen instead of running off it. */
export const ShortPhone: Story = {
  decorators: [
    (Story) => (
      <div className="relative h-[560px] w-[360px] overflow-hidden">
        <Story />
      </div>
    ),
  ],
};
