import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { AccountSettingsScreen } from './account-settings-screen';
import { NO_CAPTCHA } from './account-stories-args';

const meta = {
  title: 'Features/Contribute/AccountSettingsScreen',
  component: AccountSettingsScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    email: 'juan@example.com',
    profile: { name: 'Juan dela Cruz', phone: '+639171234567' },
    loadError: null,
    isSaving: false,
    saveError: null,
    isChangingPassword: false,
    passwordError: null,
    currentPasswordError: null,
    captcha: NO_CAPTCHA,
    passwordChangedAt: null,
    onRetry: fn(),
    onSave: fn(),
    onChangePassword: fn(),
    isDeleting: false,
    deleteError: null,
    onDeleteAsked: fn(),
    onDeleteAccount: fn(),
    onBack: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-[844px] w-97.5 overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AccountSettingsScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Save waits until the name or number changes. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1, name: 'Account settings' })).toHaveFocus();
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.type(canvas.getByLabelText('Name'), ' Jr.');
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeEnabled();
  },
};

export const Loading: Story = { args: { profile: null } };

export const LoadFailed: Story = {
  args: { profile: null, loadError: "No signal — try again when you're online" },
};

export const Saving: Story = { args: { isSaving: true } };

export const NotSaved: Story = {
  args: { saveError: "No signal — try again when you're online" },
};

/** The current password being checked, then the new one sent. */
export const ChangingPassword: Story = { args: { isChangingPassword: true } };

/** The current password given is not the account's: said on its field. */
export const WrongCurrentPassword: Story = {
  args: { currentPasswordError: 'That’s not your current password' },
};

/** The fields checked on the phone: a current password missing, a new one with no digit. */
export const PasswordFieldsChecked: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('New password'), 'onlyletters');
    await userEvent.type(canvas.getByLabelText('Confirm password'), 'onlyletters');
    await userEvent.click(canvas.getByRole('button', { name: 'Change password' }));
    await expect(canvas.getByText('Enter your current password')).toBeVisible();
    await expect(
      canvas.getByText('Use at least 8 characters, with letters and numbers'),
    ).toBeVisible();
    await expect(args.onChangePassword).not.toHaveBeenCalled();
  },
};

/** Waiting on the bot check: Change password stays off until it passes. */
export const WaitingForCheck: Story = {
  args: { captcha: { ...NO_CAPTCHA, siteKey: '1x00000000000000000000AA', isReady: false } },
};

export const PasswordChanged: Story = { args: { passwordChangedAt: 1 } };

export const PasswordNotChanged: Story = {
  args: { passwordError: "That's already your password. Choose a new one." },
};

export const LongName: Story = {
  args: {
    email: 'juan.dela.cruz.the.third.of.quezon.city@example-long-domain.com',
    profile: {
      name: 'Juan Protacio Emmanuel dela Cruz y Santos de la Rosa del Rosario',
      phone: '+639171234567',
    },
  },
};

/** A short, narrow phone: the page scrolls inside the screen instead of running off it. */
export const ShortPhone: Story = {
  decorators: [
    (Story) => (
      <div className="relative h-[560px] w-[360px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
};

/** Delete account asks first, focus on Cancel; Cancel puts focus back on Delete account. */
export const DeleteAsked: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Delete account' }));
    const sheet = within(canvas.getByRole('alertdialog', { name: 'Delete your account?' }));
    await expect(sheet.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await userEvent.click(sheet.getByRole('button', { name: 'Cancel' }));
    await expect(canvas.getByRole('button', { name: 'Delete account' })).toHaveFocus();
    await expect(args.onDeleteAccount).not.toHaveBeenCalled();
  },
};

/** Delete account failed: the line shows in the open question. */
export const DeleteFailed: Story = {
  args: { deleteError: 'No signal — try again when you’re online' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Delete account' }));
    await expect(within(canvas.getByRole('alertdialog')).getByText(/No signal/)).toBeVisible();
  },
};
