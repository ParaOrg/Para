import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { NewPasswordScreen } from './new-password-screen';
import { waitForHeadingFocus } from '../common/heading-focus-play';

const meta = {
  title: 'Features/Contribute/NewPasswordScreen',
  component: NewPasswordScreen,
  args: { isBusy: false, error: null, onSubmit: fn() },
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NewPasswordScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Made-up words the stories type: long enough, with a digit, as the screen's rule asks. */
const TYPED = 'jeepney-to-cubao-7';
const MISTYPED = 'jeepney-to-cubao-8';

/** Figma 4461:5382: no back arrow, the code has signed the phone in. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Back' })).toBeNull();
  },
};

/** The two typed differently: checked on the phone, and nothing is sent. */
export const NotMatching: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('New password'), TYPED);
    await userEvent.type(canvas.getByLabelText('Confirm password'), MISTYPED);
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(canvas.getByText("The passwords don't match")).toBeVisible();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** The same twice: Save sends it. */
export const Matching: Story = {
  play: async ({ args, canvasElement }) => {
    await waitForHeadingFocus(canvasElement);
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('New password'), TYPED);
    await userEvent.type(canvas.getByLabelText('Confirm password'), TYPED);
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));
    await expect(args.onSubmit).toHaveBeenCalledWith({ password: TYPED, confirmation: TYPED });
  },
};

/** The new password is the old one: one red line above Save. */
export const SamePassword: Story = {
  args: { error: "That's already your password. Choose a new one." },
};

/** While it saves. */
export const Saving: Story = { args: { isBusy: true } };

/** A short phone: the page scrolls inside the screen. */
export const ShortPhone: Story = {
  decorators: [
    (Story) => (
      <div className="relative h-[560px] w-[360px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
};
