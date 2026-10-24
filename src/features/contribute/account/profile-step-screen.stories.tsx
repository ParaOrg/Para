import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

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
