import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { DirectionRow } from '@/features/routes/model/routes';

import { groupBySignboard } from './hotspot-checks';
import { PANEL } from './sheet';
import { TerminalChecklist } from './terminal-checklist';

/** Sample data only, shaped like saved rows. Not read from Supabase. */
const base: DirectionRow = {
  id: 'sample-out',
  routeId: 'sample-route',
  name: 'Tala → SM Fairview',
  originTerminal: null,
  destinationTerminal: null,
  shape: null,
  reversed: false,
  confidence: 'drawn',
  ownerId: 'sample-owner',
  updatedAt: '2026-09-21T00:00:00Z',
  route: {
    id: 'sample-route',
    ownerId: 'sample-owner',
    signboard: null,
    routeCode: null,
    shortName: null,
    longName: null,
    mode: 'jeepney',
    fareNote: null,
    fareAsOf: null,
    headHotspotId: 'sample-tala',
    tailHotspotId: 'sample-fairview',
    via: null,
    name: 'Tala – SM Fairview',
  },
};

/** One route's two ways, under its generated name. */
const route = (routeId: string, routeName: string, from: string, to: string): DirectionRow[] =>
  [`${from} → ${to}`, `${to} → ${from}`].map((name, i) => ({
    ...base,
    id: `${routeId}-${i}`,
    routeId,
    name,
    route: { ...base.route, id: routeId, name: routeName },
  }));

const SOME = groupBySignboard([
  ...route('tala', 'Tala – SM Fairview', 'Tala', 'SM Fairview'),
  ...route('novaliches', 'Novaliches – SM Fairview', 'Novaliches', 'SM Fairview'),
]);

const MANY = groupBySignboard(
  [
    'Bagong Silang',
    'Camarin',
    'Deparo',
    'Lagro',
    'Novaliches',
    'Quiapo',
    'Tala',
    'Zabarte',
  ].flatMap((from) => route(from.toLowerCase(), `${from} – SM Fairview`, from, 'SM Fairview')),
);

/**
 * A terminal's routes on the hotspot panel (HotspotPanel): every direction,
 * under its route's name, pre-ticked with those starting inside the outline.
 */
const meta = {
  title: 'Features/Studio/TerminalChecklist',
  component: TerminalChecklist,
  decorators: [
    (Story) => (
      <div className={PANEL}>
        <Story />
      </div>
    ),
  ],
  args: { groups: SOME, ticked: new Set(['tala-0']), onToggle: fn() },
} satisfies Meta<typeof TerminalChecklist>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two routes, the one starting here ticked; a box tapped asks to toggle its direction. */
export const SomeTicked: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('checkbox', { name: 'Tala → SM Fairview' })).toBeChecked();
    await expect(canvas.getByRole('checkbox', { name: 'SM Fairview → Tala' })).not.toBeChecked();
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Novaliches → SM Fairview' }));
    await expect(args.onToggle).toHaveBeenCalledWith('novaliches-0');
  },
};

/** No saved routes yet. */
export const Empty: Story = {
  args: { groups: [], ticked: new Set() },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('No saved routes yet.')).toBeVisible();
  },
};

/** Many routes: the list scrolls inside the panel. */
export const LongList: Story = { args: { groups: MANY, ticked: new Set() } };

/**
 * A long list at a phone's width, in the panel's full-screen sheet: the
 * sheet follows the viewport, not this box.
 */
export const Phone: Story = {
  args: { groups: MANY, ticked: new Set(['tala-0']) },
  parameters: { phone: true },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
