import type { Meta, StoryObj } from '@storybook/react-vite';

import { CARD_SURFACE } from './livery-card';
import { RouteTripDetailHeader } from './route-trip-detail-header';
import { RAIL_LIVERY } from '../model/liveries';

/**
 * The header on its line's card colour, as the top of a train trip's card
 * shows it: that colour is the divider between the halves, and the ground the
 * white Train is read against. Each line, each bound.
 */
const meta = {
  title: 'Features/Routes/RouteTripDetailHeader',
  component: RouteTripDetailHeader,
  render: (args) => (
    <div className={'w-[369px] rounded-2xl ' + CARD_SURFACE[RAIL_LIVERY[args.line]]}>
      <RouteTripDetailHeader {...args} />
    </div>
  ),
  args: { line: 'LRT-1', bound: 'Northbound' },
} satisfies Meta<typeof RouteTripDetailHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** LRT-1 Northbound, as Figma draws it (4170:7046). */
export const Lrt1Northbound: Story = {};

export const Lrt1Southbound: Story = { args: { bound: 'Southbound' } };

/** LRT-2 runs east–west: Westbound toward Recto. */
export const Lrt2Westbound: Story = { args: { line: 'LRT-2', bound: 'Westbound' } };

export const Lrt2Eastbound: Story = { args: { line: 'LRT-2', bound: 'Eastbound' } };

/** MRT-3's words are Content/primary: its yellow is unreadable on white (the owner, 2026-10-16). */
export const Mrt3Northbound: Story = { args: { line: 'MRT-3', bound: 'Northbound' } };

export const Mrt3Southbound: Story = { args: { line: 'MRT-3', bound: 'Southbound' } };

/** An end the line's table does not know: no bound. Undesigned: the code alone, rounded both ends, is Claude's call of 2026-10-16; the owner's to say. */
export const NoBound: Story = { args: { bound: null } };

/** On a phone: the width of the app's root, a container as the app's is. */
export const Phone: Story = {
  render: (args) => (
    <div className={'@container w-[390px] ' + CARD_SURFACE[RAIL_LIVERY[args.line]]}>
      <RouteTripDetailHeader {...args} />
    </div>
  ),
  args: { line: 'LRT-2', bound: 'Eastbound' },
};
