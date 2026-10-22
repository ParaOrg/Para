import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { CARD_SURFACE, CARD_TEXT } from './livery-card';
import { RailwayBadge } from './railway-badge';
import { RouteEndPointBar } from './route-end-point-bar';

/**
 * Figma's .RouteEndPointBar (3848:11928): RouteCard (on a card's colour, 40 tall) and
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
            : 'w-96 ' + CARD_SURFACE[args.on] + ' ' + CARD_TEXT[args.on]
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

/** RouteCard at Rest, on a red card: its words, 40 tall. */
export const OnRed: Story = {
  args: { on: 'red' },
  play: async ({ canvasElement }) => {
    const row = within(canvasElement).getByRole('button', { name: 'SM Fairview' });
    await expect(row.getBoundingClientRect().height).toBe(40);
  },
};

/** RouteCard Pressed: Card/red/Timeline/surface. */
export const OnRedPressed: Story = {
  args: { on: 'red', className: 'bg-card-red-timeline-surface' },
};

/** The last row of a card's group: the line ends at its stub. */
export const OnRedLast: Story = { args: { on: 'red', position: 'bottom' } };

/** On MRT-3's yellow the row and its line take the card's dark words. */
export const OnDarkWords: Story = { args: { on: 'metro-rail-way-three', position: 'bottom' } };

/** The ❄️ Slot filled, after the name: a station's badge, as RouteCardRailway puts it. */
export const WithSlot: Story = {
  args: {
    on: 'light-rail-way-two',
    position: 'bottom',
    routeDirection: 'Recto',
    size: 'xl',
    slot: <RailwayBadge kind="end" railway="LRT-2" code="PL01" />,
  },
};

/** A long place wraps under itself, the line stretching to the row's height. */
export const LongName: Story = {
  args: { routeDirection: 'Bagong Silang Kanan 5 Phase 3 Package 2 Terminal' },
};
