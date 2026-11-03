import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ThankYouScreen } from './thank-you-screen';

const meta = {
  title: 'Features/Contribute/ThankYouScreen',
  component: ThankYouScreen,
  args: { onContinue: fn() },
  decorators: [
    (Story) => (
      <div className="relative h-[852px] w-[393px] overflow-hidden bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ThankYouScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Figma 4461:4615. */
export const Default: Story = {};

/** Continue leads on. */
export const Continue: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Continue' }));
    await expect(args.onContinue).toHaveBeenCalledOnce();
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
