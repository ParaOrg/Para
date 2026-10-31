import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { AccountSettingsScreen } from './account-settings-screen';

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
    passwordChangedAt: null,
    onRetry: fn(),
    onSave: fn(),
    onChangePassword: fn(),
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

/** A new password, the fields checked on the phone before it is sent. */
export const ChangingPassword: Story = { args: { isChangingPassword: true } };

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
