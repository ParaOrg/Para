import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { BottomToolbar } from './bottom-toolbar';

// Typed, not satisfied: the props are a union on `current`, which `satisfies` cannot narrow.
const meta: Meta<typeof BottomToolbar> = {
  title: 'Features/Contribute/BottomToolbar',
  component: BottomToolbar,
  args: { onOpenRecord: fn(), onOpenAccount: fn() },
  decorators: [
    (Story) => (
      <div className="w-[393px] bg-surface-quaternary p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BottomToolbar>;

/** Record, the screen showing, then History and Account (4496:10482). */
export const Default: Story = { args: { onOpenHistory: fn() } };

/** A build with no accounts: Record and History, and no Account to open. */
export const WithoutAccounts: Story = {
  args: { onOpenHistory: fn(), onOpenAccount: undefined },
};

/** On Account: Account marked, Record the way back to Start (4496:10482). */
export const OnAccount: Story = { args: { current: 'account', onOpenHistory: fn() } };

/** On History: History marked, Record and Account beside it (4514:23092). */
export const OnHistory: Story = { args: { current: 'history' } };
