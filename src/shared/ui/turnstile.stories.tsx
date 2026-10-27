import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Turnstile } from './turnstile';

const meta = {
  title: 'Shared/UI/Turnstile',
  component: Turnstile,
  // Cloudflare's test keys: 1x…AA always passes, 2x…AB always fails.
  args: { siteKey: '1x00000000000000000000AA', onToken: fn() },
  decorators: [
    (Story) => (
      <div className="w-[300px] bg-surface text-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Turnstile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Cloudflare's own widget, from its servers; offline this shows Cannot load instead. */
export const Passes: Story = {};

export const Fails: Story = { args: { siteKey: '2x00000000000000000000AB' } };

/** Waiting for the check: the form's button stays off, and this says why. */
export const Loading: Story = {
  args: {
    scriptUrl: 'data:text/javascript,window.turnstile={render(){return "story"},remove(){}}',
  },
};

/** The script did not arrive: a plain message says what to do. */
export const CannotLoad: Story = {
  args: { scriptUrl: 'data:text/javascript,throw new Error("blocked")' },
};
