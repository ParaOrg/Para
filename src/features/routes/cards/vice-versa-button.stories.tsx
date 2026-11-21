import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ViceVersaButton } from './vice-versa-button';

/** Vice Versa (4831:51276) on the map's grey, where it floats over the route list. */
const meta = {
  title: 'Features/Routes/ViceVersaButton',
  component: ViceVersaButton,
  args: { way: 'Papunta', wayTo: 'Pabalik', isSwitchable: true, isBack: false, onSwitch: fn() },
  decorators: [
    (Story) => (
      <div className="flex bg-bg-surface-secondary p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ViceVersaButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The way there showing: its words never change, and a screen reader hears which way is showing
 * and where a tap leads. A tap turns every route listed round.
 */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Vice Versa' });
    await expect(button).toHaveAccessibleDescription('Papunta showing, turns to Pabalik');
    await expect(button).toHaveAttribute('data-back', 'false');
    await userEvent.click(button);
    await expect(args.onSwitch).toHaveBeenCalledTimes(1);
  },
};

/** The way back showing: the same words, the hint the other way round. */
export const TheWayBack: Story = {
  args: { way: 'Pabalik', wayTo: 'Papunta', isBack: true },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Vice Versa' });
    await expect(button).toHaveAccessibleDescription('Pabalik showing, turns to Papunta');
    await expect(button).toHaveAttribute('data-back', 'true');
  },
};

/** A train's line listed: its bounds in the hint. */
export const TrainBounds: Story = {
  args: { way: 'Roosevelt bound', wayTo: 'Dr. Santos bound' },
};

/** Nothing drawn the other way round: it rests disabled at the set's opacity, and a tap does nothing. */
export const Disabled: Story = {
  args: { isSwitchable: false },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Vice Versa' });
    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await expect(args.onSwitch).not.toHaveBeenCalled();
  },
};

/** On a phone's map, 393 wide, at the bottom left over the sheet, as the public map stands it. */
export const OnPhone: Story = {
  decorators: [
    (Story) => (
      <div className="@container relative h-60 w-98.25 overflow-hidden bg-bg-surface-secondary">
        <div className="absolute inset-x-0 bottom-0 h-24 rounded-t-3xl bg-bg-surface" />
        <div className="absolute bottom-27 left-4 flex">
          <Story />
        </div>
      </div>
    ),
  ],
};
