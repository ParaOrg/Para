import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { NO_CAPTCHA } from './account-stories-args';
import { CreateAccountScreen } from './create-account-screen';

const meta = {
  title: 'Features/Contribute/CreateAccountScreen',
  component: CreateAccountScreen,
  args: {
    isBusy: false,
    error: null,
    captcha: NO_CAPTCHA,
    onSubmit: fn(),
    onSignIn: fn(),
  },
  decorators: [
    (Story) => (
      <div className="relative h-[844px] w-[390px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CreateAccountScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A refused try: one line under the fields. */
export const EmailTaken: Story = { args: { error: 'That email already has an account' } };

/** While the request is out: both buttons wait. */
export const Busy: Story = { args: { isBusy: true } };

/** A short phone: the sheet scrolls inside the screen instead of running off it. */
export const ShortPhone: Story = {
  decorators: [
    (Story) => (
      <div className="relative h-[560px] w-[360px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
};
