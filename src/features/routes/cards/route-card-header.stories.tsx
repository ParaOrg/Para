import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { RouteCardHeader } from './route-card-header';

/**
 * The top of the route list and of a trip (Figma 3742:1049): Default,
 * Routes and the count, over a list; Variant2, ‹ back, over a trip. SWITCH
 * names the way a tap leads to (switchWord): Pabalik
 * over Papunta and back, on a train the other bound. It rests disabled when
 * the other way round has nothing drawn.
 * Rendered by hand: its two shapes of props do not make one set of args.
 */
const meta: Meta = {
  title: 'Features/Routes/RouteCardHeader',
  decorators: [
    // Marked @container, as the apps' roots are, and wide enough inside its padding for
    // `@float:` (64rem): there the header has 12 above it, as over the corner
    // card; on a phone (the Phone story) it sits flush under the dock's
    // HandleNotch (3815:5637).
    (Story, ctx) => (
      <div
        className={
          '@container bg-neutral-200 p-4 ' + (ctx.parameters.phone ? 'w-[393px]' : 'w-[1088px]')
        }
      >
        <div className="w-96 max-w-full">
          <Story />
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

// Papunta showing, so SWITCH names where a tap leads: Pabalik.
const common = { onSwitch: fn(), onClose: fn(), switchable: true, back: false, way: 'Pabalik' };

/** Over the route list: Routes and the count (4192:12133). */
export const Default: Story = {
  render: () => <RouteCardHeader {...common} routeCount="2 Routes" />,
};

/** Over the route list, one route. */
export const OneRoute: Story = {
  render: () => <RouteCardHeader {...common} routeCount="1 Route" />,
};

/** A tap with only hotspots under it: their count. */
export const Hotspots: Story = {
  render: () => <RouteCardHeader {...common} routeCount="2 Hotspots" />,
};

/** The way back showing: SWITCH reads Papunta, the way a tap leads. */
export const WayBack: Story = {
  render: () => <RouteCardHeader {...common} back way="Papunta" routeCount="2 Routes" />,
};

/** Nothing drawn the other way round: SWITCH rests disabled. */
export const NothingToSwitchTo: Story = {
  render: () => <RouteCardHeader {...common} switchable={false} routeCount="1 Route" />,
};

/** Over a trip (Variant2): ‹ back to what it was picked from. */
export const OverATrip: Story = {
  render: () => <RouteCardHeader {...common} onBackToList={fn()} />,
};

/** Over a Northbound train's trip: SWITCH names the other bound. */
export const OverATrain: Story = {
  render: () => <RouteCardHeader {...common} way="Southbound" onBackToList={fn()} />,
};

/** LRT-2 runs east–west: Westbound on SWITCH over an Eastbound trip. */
export const OverAnEastWestTrain: Story = {
  render: () => <RouteCardHeader {...common} back way="Westbound" onBackToList={fn()} />,
};

/** A trip opened on its own, no route sharing an end drawn its way round: no ‹. */
export const OverATripAlone: Story = {
  render: () => <RouteCardHeader {...common} onBackToList={null} />,
};

/** On a phone: flush under the dock's HandleNotch, nothing above it. */
export const Phone: Story = {
  parameters: { phone: true },
  render: () => <RouteCardHeader {...common} onBackToList={fn()} />,
};
