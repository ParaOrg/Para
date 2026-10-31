import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BottomToolbar, type ToolbarTab } from './bottom-toolbar';

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

/** The pill's own test bench: a toolbar that switches tab when one is pressed, as the page does. */
function SwitchingToolbar() {
  const [current, setCurrent] = useState<ToolbarTab>('record');
  // Each screen draws its own toolbar: a key per tab mounts a new one, as switching screens does.
  return current === 'history' ? (
    <BottomToolbar
      key={current}
      current="history"
      onOpenRecord={() => setCurrent('record')}
      onOpenAccount={() => setCurrent('account')}
    />
  ) : (
    <BottomToolbar
      key={current}
      current={current}
      onOpenRecord={() => setCurrent('record')}
      onOpenHistory={() => setCurrent('history')}
      onOpenAccount={() => setCurrent('account')}
    />
  );
}

/**
 * Pressing a tab slides the pill to it, 250 ms, its words and icon darkening as the last tab's
 * grey; with less motion asked for it just moves.
 */
export const Switching: Story = {
  render: () => <SwitchingToolbar />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'History' }));
    const pill = canvasElement.querySelector<HTMLElement>('.tab-toolbar > span[aria-hidden]');
    const marked = canvas.getByText('History', { selector: '[aria-current="page"]' });
    await expect(marked).toBeInTheDocument();
    // Wherever the slide is, it ends under the tab now showing.
    await Promise.all(pill?.getAnimations().map((animation) => animation.finished) ?? []);
    await expect(pill?.style.transform).toBe(`translateX(${marked.offsetLeft}px)`);
    await userEvent.click(canvas.getByRole('button', { name: 'Account' }));
    await expect(
      canvas.getByText('Account', { selector: '[aria-current="page"]' }),
    ).toBeInTheDocument();
  },
};
