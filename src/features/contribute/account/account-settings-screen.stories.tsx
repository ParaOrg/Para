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
    isPasswordChanged: false,
    onRetry: fn(),
    onSave: fn(),
    onOpenChangePassword: fn(),
    onOpenDeleteAccount: fn(),
    onBack: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AccountSettingsScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma's first frame: no Save changes until the name or number changes. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 1, name: 'Account settings' })).toHaveFocus();
    await expect(canvas.queryByRole('button', { name: 'Save changes' })).toBeNull();
    await expect(canvas.getByLabelText('Phone number')).toHaveValue('9171234567');
  },
};

/** Figma's second frame: a change raises Save changes and Cancel; Cancel puts it back. */
export const Edited: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Name'), ' Jr.');
    await expect(canvas.getByRole('button', { name: 'Save changes' })).toBeEnabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));
    await expect(canvas.getByLabelText('Name')).toHaveValue('Juan dela Cruz');
    await expect(canvas.queryByRole('button', { name: 'Save changes' })).toBeNull();
    await userEvent.type(canvas.getByLabelText('Name'), ' Jr.');
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
    await expect(args.onSave).toHaveBeenCalledWith({
      name: 'Juan dela Cruz Jr.',
      phone: '+639171234567',
    });
  },
};

/** A number that is not a Philippine mobile is named on its field, and nothing is sent. */
export const BadNumber: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const phone = canvas.getByLabelText('Phone number');
    await userEvent.clear(phone);
    await userEvent.type(phone, '12345');
    await userEvent.click(canvas.getByRole('button', { name: 'Save changes' }));
    await expect(args.onSave).not.toHaveBeenCalled();
  },
};

/** Password opens Change password. */
export const OpensChangePassword: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Change password' }));
    await expect(args.onOpenChangePassword).toHaveBeenCalled();
  },
};

/** The profile still coming: the two fields' shapes shimmer after the first moments. */
export const Loading: Story = { args: { profile: null } };

export const LoadFailed: Story = {
  args: { profile: null, loadError: "No signal — try again when you're online" },
};

/** Saving: the sheet stays up, its Save changes saying so. */
export const Saving: Story = {
  args: { isSaving: true },
};

/** A save that did not go through: said over Save changes, the change kept. */
export const NotSaved: Story = {
  args: { saveError: "No signal — try again when you're online" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('Name'), ' Jr.');
    await expect(canvas.getByRole('alert')).toHaveTextContent(/No signal/);
  },
};

/** Back from Change password, done: the focused heading reads the news out with it. */
export const PasswordChanged: Story = {
  args: { isPasswordChanged: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const heading = canvas.getByRole('heading', { level: 1, name: 'Account settings' });
    await expect(heading).toHaveFocus();
    await expect(heading).toHaveAccessibleDescription('Your password is changed.');
  },
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
      <div className="relative h-[560px] w-[360px] overflow-hidden">
        <Story />
      </div>
    ),
  ],
};

/** Delete account opens Delete account. */
export const OpensDeleteAccount: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Delete account' }));
    await expect(args.onOpenDeleteAccount).toHaveBeenCalled();
  },
};

/** In the Android app: Keep Para recording, over Delete account, opens the maker's Autostart. */
export const InTheApp: Story = {
  args: { onOpenKeepRecording: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Keep Para recording' }));
    await expect(args.onOpenKeepRecording).toHaveBeenCalledOnce();
  },
};
