import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { RouteEndPointBar } from './route-end-point-bar';
import { VEHICLES } from '../model/vehicles';

/**
 * Figma's .RouteEndPointBar, variant RouteTripDetail (3848:11928), at Rest and Pressed, the route's
 * vehicle at the row's end. A RouteCard's row is RouteCardEndPoint.
 */
const meta = {
  title: 'Features/Routes/RouteEndPointBar',
  component: RouteEndPointBar,
  args: { routeDirection: 'SM Fairview', vehicle: 'Jeepney', onClick: fn() },
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
export const Rest: Story = {
  play: async ({ canvasElement, args }) => {
    // The vehicle is hidden: the row's name is its route's direction alone.
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'SM Fairview' }));
    await expect(args.onClick).toHaveBeenCalled();
  },
};

/** RouteTripDetail Pressed: Background/surface-tertiary, as Figma draws it (forced here with the pressed fill). */
export const Pressed: Story = { args: { className: 'bg-surface-tertiary' } };

/**
 * Every vehicle, each row its own route's (Figma draws the Jeep alone; the owner keeps each row's
 * own).
 */
export const EveryVehicle: Story = {
  render: (args) => (
    <ul className="w-96">
      {VEHICLES.map((vehicle) => (
        <li key={vehicle}>
          <RouteEndPointBar {...args} vehicle={vehicle} routeDirection={vehicle} />
        </li>
      ))}
    </ul>
  ),
};

/** A mode with no drawing (UV Express, P2P, tricycle): the row without a vehicle. */
export const NoVehicle: Story = { args: { vehicle: null } };

/** A long place wraps under itself, the arrow and the vehicle centred beside it. */
export const LongName: Story = {
  args: { routeDirection: 'Bagong Silang Kanan 5 Phase 3 Package 2 Terminal' },
};
