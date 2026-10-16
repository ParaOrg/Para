import type { Meta, StoryObj } from '@storybook/react-vite';

import { CARD_SURFACE, CARD_TEXT } from './livery-card';
import { RouteTripDetailHeader } from './route-trip-detail-header';
import { JEEPNEY_LIVERIES } from '../model/liveries';

/**
 * The header on its card's colour, as the top of a trip's card shows it: that
 * colour is the divider between the halves, and the ground the vehicle is
 * read against, in the card's words colour (CARD_TEXT), as the card gives it.
 * Each line and bound, then each vehicle, Papunta and Pabalik.
 */
const meta = {
  title: 'Features/Routes/RouteTripDetailHeader',
  component: RouteTripDetailHeader,
  render: (args) => (
    <div
      className={
        'w-[369px] rounded-2xl ' + CARD_SURFACE[args.livery] + ' ' + CARD_TEXT[args.livery]
      }
    >
      <RouteTripDetailHeader {...args} />
    </div>
  ),
  args: { vehicle: 'LRT-1', way: 'Northbound', livery: 'light-rail-way-one' },
} satisfies Meta<typeof RouteTripDetailHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** LRT-1 Northbound, as Figma draws it (4170:7046). */
export const Lrt1Northbound: Story = {};

export const Lrt1Southbound: Story = { args: { way: 'Southbound' } };

/** LRT-2 runs east–west: Westbound toward Recto. */
export const Lrt2Westbound: Story = {
  args: { vehicle: 'LRT-2', way: 'Westbound', livery: 'light-rail-way-two' },
};

export const Lrt2Eastbound: Story = {
  args: { vehicle: 'LRT-2', way: 'Eastbound', livery: 'light-rail-way-two' },
};

/**
 * MRT-3's words are Content/primary, its yellow unreadable on white, and so is its Train on the
 * yellow card.
 */
export const Mrt3Northbound: Story = {
  args: { vehicle: 'MRT-3', way: 'Northbound', livery: 'metro-rail-way-three' },
};

export const Mrt3Southbound: Story = {
  args: { vehicle: 'MRT-3', way: 'Southbound', livery: 'metro-rail-way-three' },
};

/**
 * A train on a jeep-coloured card, opened from a hotspot's card: its words keep the line's colour.
 */
export const TrainOnAJeepCard: Story = { args: { livery: 'red' } };

/** An end the line's table does not know: no bound, the line's code alone, rounded both ends. */
export const NoBound: Story = { args: { way: null } };

/** A jeep's trip (Variant2, 4181:10845): the Jeepney and the way showing, in its card's colour. */
export const Jeepney: Story = { args: { vehicle: 'Jeepney', way: 'Papunta', livery: 'red' } };

export const JeepneyPabalik: Story = {
  args: { vehicle: 'Jeepney', way: 'Pabalik', livery: 'violet' },
};

/** Variant3 (4188:11147). No bus is on the published map yet. */
export const Bus: Story = { args: { vehicle: 'Bus', way: 'Papunta', livery: 'orange' } };

/** Variant4 (4188:11159). No e-jeep is on the published map yet. */
export const EJeep: Story = { args: { vehicle: 'E-Jeep', way: 'Papunta', livery: 'pink' } };

/** Variant5 (4189:11181). */
export const Ferry: Story = { args: { vehicle: 'Ferry', way: 'Papunta', livery: 'fuchsia' } };

/** Every jeepney colour, the words in each card's own. */
export const EveryJeepneyLivery: Story = {
  render: (args) => (
    <div className="flex w-[369px] flex-col gap-1">
      {JEEPNEY_LIVERIES.map((livery) => (
        <div
          key={livery}
          className={'rounded-2xl ' + CARD_SURFACE[livery] + ' ' + CARD_TEXT[livery]}
        >
          <RouteTripDetailHeader {...args} livery={livery} />
        </div>
      ))}
    </div>
  ),
  args: { vehicle: 'Jeepney', way: 'Papunta' },
};

/** On a phone: the width of the app's root, a container as the app's is. */
export const Phone: Story = {
  render: (args) => (
    <div
      className={'@container w-[390px] ' + CARD_SURFACE[args.livery] + ' ' + CARD_TEXT[args.livery]}
    >
      <RouteTripDetailHeader {...args} />
    </div>
  ),
  args: { vehicle: 'LRT-2', way: 'Eastbound', livery: 'light-rail-way-two' },
};
