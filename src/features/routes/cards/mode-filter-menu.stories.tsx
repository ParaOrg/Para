import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ModeFilterMenu } from './mode-filter-menu';
import type { ModePicks } from '../model/mode-filter';

interface KeepingProps {
  /** The picks it opens on. */
  picks: ModePicks;
  onPicks: (picks: ModePicks) => void;
  routeCount: number;
  onClose: () => void;
}

/** Keeps the picks as the apps do, so a story can be tapped through. */
function Keeping({ picks: startsOn, onPicks, routeCount, onClose }: KeepingProps) {
  const [picks, setPicks] = useState(startsOn);
  return (
    <ModeFilterMenu
      picks={picks}
      onPicks={(next) => {
        onPicks(next);
        setPicks(next);
      }}
      routeCount={routeCount}
      onClose={onClose}
    />
  );
}

/** The route list's filter (4896:42082): a sheet at a phone's foot, a card in a wide screen's middle. */
const meta = {
  title: 'Features/Routes/ModeFilterMenu',
  component: Keeping,
  args: { picks: [], onPicks: fn(), routeCount: 36, onClose: fn() },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Keeping>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing picked: every switch off, every route listed. */
export const Default: Story = {};

/** As the owner draws it: five modes on, Train and Ferry off. */
export const SeveralPicked: Story = {
  args: { picks: ['jeep', 'ejeep', 'uv', 'bus', 'p2p'] },
};

/**
 * A switch applies as it is tapped, and another adds to it; Clear all lets them all go. Escape is
 * the menu's alone: it closes the menu and goes no further (prevented, as the list behind reads it).
 */
export const Tapped: Story = {
  play: async ({ args, canvasElement }) => {
    const menu = within(canvasElement.ownerDocument.body);
    await userEvent.click(menu.getByRole('switch', { name: 'Jeepney' }));
    await expect(args.onPicks).toHaveBeenLastCalledWith(['jeep']);
    await userEvent.click(menu.getByRole('switch', { name: 'Train' }));
    await expect(args.onPicks).toHaveBeenLastCalledWith(['jeep', 'train']);
    await expect(menu.getByRole('switch', { name: 'Train' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.click(menu.getByRole('button', { name: 'Clear all' }));
    await expect(args.onPicks).toHaveBeenLastCalledWith([]);
    let isEscapeLeftToTheList = true;
    canvasElement.ownerDocument.addEventListener(
      'keydown',
      (event) => {
        isEscapeLeftToTheList = !event.defaultPrevented;
      },
      { once: true },
    );
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalled();
    await expect(isEscapeLeftToTheList).toBe(false);
  },
};

/** One route left: "Show 1 route". */
export const OneRoute: Story = { args: { picks: ['ferry'], routeCount: 1 } };

/** Nothing left under the picks: the list behind says so; the button still closes the menu. */
export const NoRoutes: Story = { args: { picks: ['ferry'], routeCount: 0 } };

/** A tap on the scrim, outside the sheet, closes it. */
export const ScrimTapCloses: Story = {
  play: async ({ args, canvasElement }) => {
    // The scrim is the dialog's backdrop: a tap there lands on the dialog itself, not inside it.
    const dialog = within(canvasElement.ownerDocument.body).getByTestId('mode-filter');
    await userEvent.pointer({
      keys: '[MouseLeft]',
      target: dialog,
      coords: { clientX: 4, clientY: 4 },
    });
    await expect(args.onClose).toHaveBeenCalled();
  },
};

/**
 * On a phone: the sheet at the foot, rounded at its top (4896:42615). A modal dialog sits in the top
 * layer, against the viewport, so the story sets the viewport (as InstallPrompt's does).
 */
export const OnPhone: Story = {
  args: { picks: ['jeep', 'ejeep', 'uv', 'bus', 'p2p'] },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
