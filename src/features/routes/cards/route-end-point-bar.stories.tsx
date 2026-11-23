import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { RouteBadge } from './route-badge';
import { ROUTE_CARD_SURFACE, ROUTE_CARD_TEXT } from './route-card-look';
import { RouteEndPointBar } from './route-end-point-bar';

/**
 * Figma's .RouteEndPointBar (3848:11928): RouteCard (on a card's colour, medium, 32 tall) and
 * RouteTripDetail (on the sheet's surface, rounded, 40 tall), each at Rest and Pressed, the tree
 * line before the place. Pressed is a browser state, `:active`: hold a row to see it; the stories
 * force it with the pressed fill.
 */
const meta = {
  title: 'Features/Routes/RouteEndPointBar',
  component: RouteEndPointBar,
  args: { routeDirection: 'SM Fairview', on: 'surface', position: 'top', onClick: fn() },
  decorators: [
    (Story, { args }) => (
      <div
        className={
          args.on === 'surface'
            ? 'w-96 bg-surface p-3'
            : 'w-96 ' + ROUTE_CARD_SURFACE[args.on] + ' ' + ROUTE_CARD_TEXT[args.on]
        }
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RouteEndPointBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** RouteTripDetail at Rest, a trip's "Other routes" row: rounded, 40 tall; a tap calls onClick. */
export const OnSurface: Story = {
  play: async ({ canvasElement, args }) => {
    const row = within(canvasElement).getByRole('button', { name: 'SM Fairview' });
    await expect(row.getBoundingClientRect().height).toBe(40);
    await userEvent.click(row);
    await expect(args.onClick).toHaveBeenCalled();
  },
};

/** RouteTripDetail Pressed: Background/surface-tertiary, as Figma draws it. */
export const OnSurfacePressed: Story = { args: { className: 'bg-surface-tertiary' } };

/** The last row of a trip's "Other routes": the line ends at its stub. */
export const OnSurfaceLast: Story = { args: { position: 'bottom' } };

/** RouteCard at Rest, on a bus card: Medium 17/24, 32 tall. */
export const OnBus: Story = {
  args: { on: 'bus', size: 'medium' },
  play: async ({ canvasElement }) => {
    const row = within(canvasElement).getByRole('button', { name: 'SM Fairview' });
    await expect(row.getBoundingClientRect().height).toBe(32);
  },
};

/** RouteCard Pressed: Card/Bus/Bus-surface-secondary. */
export const OnBusPressed: Story = {
  args: { on: 'bus', size: 'medium', className: 'bg-card-bus-surface-secondary' },
};

/** The last row of a card's group: the line ends at its stub. */
export const OnBusLast: Story = { args: { on: 'bus', size: 'medium', position: 'bottom' } };

/** On MRT-3's yellow the row and its line take the card's dark words. */
export const OnDarkWords: Story = {
  args: { on: 'metro-rail-way-three', size: 'medium', position: 'bottom' },
};

/** The ❄️ Slot filled, after the name: a station's code, as a train RouteCard puts it. */
export const WithSlot: Story = {
  args: {
    on: 'light-rail-way-two',
    position: 'bottom',
    routeDirection: 'Recto',
    size: 'medium',
    slot: <RouteBadge label="PL01" livery="light-rail-way-two" />,
  },
};

/** A long place wraps under itself, the line stretching to the row's height. */
export const LongName: Story = {
  args: { routeDirection: 'Bagong Silang Kanan 5 Phase 3 Package 2 Terminal' },
};
