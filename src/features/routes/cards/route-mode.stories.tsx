import type { Meta, StoryObj } from '@storybook/react-vite';

import { CARD_SURFACE, CARD_TEXT } from './livery-card';
import { RouteMode } from './route-mode';
import { VEHICLES } from '../model/vehicles';

/** Figma's Modes (4236:17040): what a card's routes ride, in the card's words' colour (white on red here). */
const meta = {
  title: 'Features/Routes/RouteMode',
  component: RouteMode,
  args: { vehicle: 'Jeepney' },
  decorators: [
    (Story) => (
      <div className="w-96 bg-card-red-surface p-3 text-content-inverse">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RouteMode>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Property 1=Jeepney. */
export const Jeepney: Story = {};

/** Property 1=Train: every rail line says "Train" on a card. */
export const Train: Story = { args: { vehicle: 'MRT-3' } };

/** Property 1=Ferry. */
export const Ferry: Story = { args: { vehicle: 'Ferry' } };

/** Property 1=E-Jeep. */
export const EJeep: Story = { args: { vehicle: 'E-Jeep' } };

/** Property 1=Bus. */
export const Bus: Story = { args: { vehicle: 'Bus' } };

/** Every vehicle the code draws, one under another as a card with mixed modes shows them. */
export const EveryVehicle: Story = {
  render: () => (
    <ul className="flex flex-col gap-2">
      {VEHICLES.map((vehicle) => (
        <li key={vehicle}>
          <RouteMode vehicle={vehicle} />
        </li>
      ))}
    </ul>
  ),
};

/** On MRT-3's yellow the label takes the card's dark words, as its place name does. */
export const OnDarkWords: Story = {
  args: { vehicle: 'MRT-3' },
  decorators: [
    (Story) => (
      <div
        className={
          'w-96 p-3 ' +
          CARD_SURFACE['metro-rail-way-three'] +
          ' ' +
          CARD_TEXT['metro-rail-way-three']
        }
      >
        <Story />
      </div>
    ),
  ],
};
