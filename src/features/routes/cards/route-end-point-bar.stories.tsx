import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { CARD_SURFACE, CARD_TEXT } from './livery-card';
import { RouteEndPointBar } from './route-end-point-bar';
import { VEHICLES } from '../model/vehicles';

/**
 * Figma's .RouteEndPointBar (3848:11928): RouteTripDetail (on the sheet's
 * surface) and RouteCard (on a card's colour), each at Rest and Pressed, the
 * route's vehicle at the row's end.
 */
const meta = {
  title: 'Features/Routes/RouteEndPointBar',
  component: RouteEndPointBar,
  args: { routeDirection: 'SM Fairview', on: 'surface', vehicle: 'Jeepney', onClick: fn() },
  decorators: [
    (Story) => (
      <div className="w-96 bg-surface p-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RouteEndPointBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** RouteTripDetail at Rest, a trip's "Other routes" row: rounded, its Jeep at 75; a tap calls onClick. */
export const OnSurface: Story = {
  play: async ({ canvasElement, args }) => {
    // The vehicle is hidden: the row's name is its route's direction alone.
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'SM Fairview' }));
    await expect(args.onClick).toHaveBeenCalled();
  },
};

/** RouteTripDetail Pressed: Background/surface-tertiary, as Figma draws it (forced here with the pressed fill). */
export const OnSurfacePressed: Story = { args: { className: 'bg-surface-tertiary' } };

/** RouteCard at Rest, on a red card: its words, its Jeep white at 70. */
export const OnRed: Story = {
  args: { on: 'red' },
  decorators: [
    (Story) => (
      <div className={'w-96 ' + CARD_SURFACE.red + ' ' + CARD_TEXT.red}>
        <Story />
      </div>
    ),
  ],
};

/** RouteCard Pressed: Card/red/Timeline/surface (forced here with the pressed fill). */
export const OnRedPressed: Story = {
  ...OnRed,
  args: { on: 'red', className: 'bg-card-red-timeline-surface' },
};

/** Every vehicle, each row its own route's (Figma draws the Jeep alone), on both grounds. */
export const EveryVehicle: Story = {
  render: (args) => (
    <div className="flex w-96 flex-col gap-3">
      <ul className="bg-surface">
        {VEHICLES.map((vehicle) => (
          <li key={vehicle}>
            <RouteEndPointBar {...args} on="surface" vehicle={vehicle} routeDirection={vehicle} />
          </li>
        ))}
      </ul>
      <ul className={CARD_SURFACE.violet + ' ' + CARD_TEXT.violet}>
        {VEHICLES.map((vehicle) => (
          <li key={vehicle}>
            <RouteEndPointBar {...args} on="violet" vehicle={vehicle} routeDirection={vehicle} />
          </li>
        ))}
      </ul>
    </div>
  ),
};

/** A mode with no drawing (UV Express, P2P, tricycle): the row without a vehicle. */
export const NoVehicle: Story = { args: { vehicle: null } };

/** A long place wraps under itself, the arrow and the vehicle centred beside it. */
export const LongName: Story = {
  args: { routeDirection: 'Bagong Silang Kanan 5 Phase 3 Package 2 Terminal' },
};
