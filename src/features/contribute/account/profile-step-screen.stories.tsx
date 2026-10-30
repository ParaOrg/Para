import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ProfileStepScreen } from './profile-step-screen';

const meta = {
  title: 'Features/Contribute/ProfileStepScreen',
  component: ProfileStepScreen,
  args: { isBusy: false, error: null, onSubmit: fn() },
  decorators: [
    (Story) => (
      <div className="relative h-[844px] w-[390px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProfileStepScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The account was made but its name and number did not save: the line says why. */
export const NotSaved: Story = {
  args: { error: "Your account is made, but your name and number didn't save. Try again." },
};

export const Busy: Story = { args: { isBusy: true } };

/** Continue with nothing typed: both fields say what they need, and nothing is sent. */
export const FieldErrors: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }));
    await expect(canvas.getByText('Enter your name')).toBeVisible();
    await expect(canvas.getByText('Enter a mobile number like 09171234567')).toBeVisible();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

/** A short phone: the page scrolls inside the screen instead of running off it. */
export const ShortPhone: Story = {
  decorators: [
    (Story) => (
      <div className="relative h-[560px] w-[360px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
};
