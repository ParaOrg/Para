import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { Direction } from '@/features/routes/model/routes';

import type { DirectionTab } from './direction-tabs';
import { DraftLockNotice } from './draft-lock-notice';
import { RouteLineActions } from './route-line-actions';
import { RouteLineDetail } from './route-line-detail';

const route = {
  id: 'r1',
  signboard: null,
  longName: null,
  mode: 'jeepney',
  fareNote: null,
  headHotspotId: 'h1',
  tailHotspotId: 'h2',
  via: 'Maligaya',
  name: 'B. Silang Kanan Ph 5 – SM Fairview',
} as const;

const direction = (id: string, reversed: boolean, isDrawn = true): Direction => ({
  id,
  routeId: 'r1',
  name: reversed ? 'SM Fairview → B. Silang Kanan Ph 5' : 'B. Silang Kanan Ph 5 → SM Fairview',
  originTerminal: null,
  destinationTerminal: null,
  shape: isDrawn
    ? {
        type: 'LineString',
        coordinates: [
          [121.0, 14.7],
          [121.01, 14.75],
        ],
      }
    : null,
  reversed,
  confidence: 'drawn',
  route,
});

const THERE = direction('d1', false);
const BACK = direction('d2', true);
const TWO_WAYS: DirectionTab[] = [
  { direction: THERE, label: 'Northbound', isDrawn: true },
  { direction: BACK, label: 'Southbound', isDrawn: true },
];
const BACK_NOT_DRAWN: DirectionTab[] = [
  { direction: THERE, label: 'Northbound', isDrawn: true },
  { direction: direction('d2', true, false), label: 'To B. Silang Kanan Ph 5', isDrawn: false },
];

const SUMMARY = [
  { label: 'Origin', value: 'B. Silang Kanan Ph 5' },
  { label: 'Destination', value: 'SM Fairview via Maligaya' },
  { label: 'Via', value: 'Maligaya' },
  { label: 'Status', value: 'Draft', isAlert: true },
];

const FACTS = [
  { label: 'Regular fare', value: '₱23 - 24' },
  { label: 'Transport mode', value: 'Jeep' },
  { label: 'Distance', value: '11.3km' },
  { label: 'Stops', value: '5' },
];

const stop = (id: string, label: string) => ({ id, label, kind: 'hintuan' as const });
const STOPS = [
  stop('s1', 'B. Silang Kanan Phase 5'),
  stop('s2', 'Kanlaon'),
  stop('s3', 'Gesen'),
  stop('s4', 'Maligaya Palengke'),
  stop('s5', 'SM Fairview'),
];

/** A signboard as the studio's bucket serves one: an SVG, black, its words in green. */
const board = (words: string) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="98" height="40"><rect width="98" height="40" fill="#12110f"/><text x="49" y="26" font-family="sans-serif" font-size="14" font-weight="bold" fill="#3bd16f" text-anchor="middle">${words}</text></svg>`,
  );

const exporter = { busyFormat: null, problem: null, exportAs: fn(async () => undefined) };

const meta = {
  title: 'Features/Studio/RouteLineDetail',
  component: RouteLineDetail,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="flex h-160 bg-surface-quaternary">
        <Story />
      </div>
    ),
  ],
  args: {
    label: 'B. Silang Kanan Ph 5 → SM Fairview',
    tabs: TWO_WAYS,
    selectedId: 'd1',
    onSelect: fn(),
    onAddRoute: fn(),
    actions: <RouteLineActions exporter={exporter} onEdit={fn()} onExtend={fn()} onDelete={fn()} />,
    summary: SUMMARY,
    facts: FACTS,
    destinations: [
      { id: 'o1', to: 'Philcoa', via: 'Maligaya' },
      { id: 'o2', to: 'Philcoa', via: 'Almar' },
      { id: 'o3', to: 'Novaliches', via: null },
    ],
    onOpenDestination: fn(),
    signboards: [board('BAYAN'), board('SM'), board('LITEX')],
    stops: STOPS,
    onStop: fn(),
  },
} satisfies Meta<typeof RouteLineDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Both ways drawn: a tab each, named by its bound, Northbound picked; Edit Route and Extend, then
 * Export's menu (CSV, GeoJSON, JSON; a pick hands focus back to Export) and ⋮ with Delete alone.
 */
export const TwoWays: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      within(canvas.getByTestId('route-summary')).getByText('Draft', { exact: true }),
    ).toHaveClass('text-text-error');
    await expect(canvas.getByRole('tab', { name: 'Northbound' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.click(canvas.getByRole('tab', { name: 'Southbound' }));
    await expect(args.onSelect).toHaveBeenCalledWith('d2');
    const exportButton = canvas.getByRole('button', { name: 'Export' });
    await userEvent.click(exportButton);
    const formats = canvas.getAllByRole('menuitem').map((item) => item.textContent);
    await expect(formats).toEqual(['CSV', 'GeoJSON', 'JSON']);
    await userEvent.click(canvas.getByRole('menuitem', { name: 'GeoJSON' }));
    await expect(exporter.exportAs).toHaveBeenCalledWith('geojson');
    await expect(exportButton).toHaveFocus();
    await userEvent.click(canvas.getByRole('button', { name: 'More' }));
    await expect(canvas.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Delete',
    ]);
    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('menu')).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: /Kanlaon/ }));
    await expect(args.onStop).toHaveBeenCalledWith('s2');
    await userEvent.click(canvas.getByRole('button', { name: /Novaliches/ }));
    await expect(args.onOpenDestination).toHaveBeenCalledWith('o3');
  },
};

/** The way back not drawn yet: its tab offers "+ Add route", which starts drawing it. */
export const ReturnNotDrawn: Story = {
  args: { tabs: BACK_NOT_DRAWN },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: '+ Add route' }));
    await expect(args.onAddRoute).toHaveBeenCalledWith('d2');
  },
};

/**
 * Read-only (signed out, or another editor's draft open): Export alone, the locked draft's notice
 * above the tabs, and an undrawn way's tab says "Not drawn yet".
 */
export const ReadOnly: Story = {
  args: {
    tabs: BACK_NOT_DRAWN,
    onAddRoute: undefined,
    notice: <DraftLockNotice lock={{ state: 'other', name: 'Marisol' }} onRetry={fn()} />,
    actions: <RouteLineActions exporter={exporter} />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Not drawn yet')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /Edit Route|Extend|More/ })).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Export' })).toBeVisible();
  },
};

/**
 * A route that is a draft only, opened from the editor's draft: Status Draft, Edit Route, and
 * no Extend, ⋮ Delete or "+ Add route", which work on approved rows.
 */
export const DraftOnly: Story = {
  args: {
    tabs: BACK_NOT_DRAWN,
    onAddRoute: undefined,
    actions: <RouteLineActions exporter={exporter} onEdit={fn()} />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Draft', { exact: true })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Edit Route' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /Extend|More|\+ Add route/ })).toBeNull();
  },
};

/** An ikot: one direction, so no tabs, and no Extend; its tip listed once among its stops. */
export const Loop: Story = {
  args: {
    tabs: [],
    actions: <RouteLineActions exporter={exporter} onEdit={fn()} onDelete={fn()} />,
    stops: [stop('s1', 'Cubao'), stop('s2', 'Kamuning'), stop('s3', 'Kalayaan')],
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('tablist')).toBeNull();
  },
};

/** Nothing yet: no other destinations (no section), no signboard and no stops, each said so. */
export const Empty: Story = {
  args: { destinations: [], signboards: [], stops: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('Other destinations')).toBeNull();
    await expect(canvas.getByText('No signboard yet — add one in Edit Route')).toBeVisible();
    await expect(
      canvas.getByText('No stops yet — hintuans along the line show here'),
    ).toBeVisible();
  },
};

/** A file on its way: Export waits, and says so under the actions (a placeholder). */
export const Exporting: Story = {
  args: {
    actions: (
      <RouteLineActions
        exporter={{ ...exporter, busyFormat: 'csv' }}
        onEdit={fn()}
        onExtend={fn()}
        onDelete={fn()}
      />
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Export' })).toBeDisabled();
    await expect(canvas.getByText('Exporting both ways…')).toBeVisible();
  },
};

/** A failed export: what happened and what to do, a placeholder. */
export const ExportFailed: Story = {
  args: {
    actions: (
      <RouteLineActions
        exporter={{
          ...exporter,
          problem:
            "Couldn't export this route (the line could not be read). Check your connection and try again.",
        }}
        onEdit={fn()}
        onExtend={fn()}
        onDelete={fn()}
      />
    ),
  },
};

/**
 * A published route with no draft waiting and no via: its summary card has no Via row, and its
 * Status reads Published in Content/quaternary.
 */
export const Published: Story = {
  args: {
    summary: [
      { label: 'Origin', value: 'B. Silang Kanan Ph 5' },
      { label: 'Destination', value: 'SM Fairview' },
      { label: 'Status', value: 'Published' },
    ],
  },
  play: async ({ canvasElement }) => {
    const summary = within(within(canvasElement).getByTestId('route-summary'));
    await expect(summary.queryByText('Via')).toBeNull();
    await expect(summary.getByText('Published')).not.toHaveClass('text-text-error');
  },
};

/** Its draft not read yet, or not readable: Status reads "--" until it is known. */
export const StatusUnknown: Story = {
  args: {
    summary: [
      { label: 'Origin', value: 'B. Silang Kanan Ph 5' },
      { label: 'Destination', value: 'SM Fairview' },
      { label: 'Status', value: '--' },
    ],
  },
};

/** Long names and many stops: the names wrap and the panel scrolls on its own. */
export const LongContent: Story = {
  args: {
    label: 'Bagong Silang Phase 5 → SM City Fairview Main Terminal',
    summary: [
      { label: 'Origin', value: 'Bagong Silang Phase 5 Kanan Barangay Hall' },
      { label: 'Destination', value: 'SM City Fairview Main Terminal via Quirino Highway' },
      { label: 'Via', value: 'Quirino Highway' },
      { label: 'Status', value: 'Draft', isAlert: true },
    ],
    stops: Array.from({ length: 18 }, (_, i) =>
      stop(`l${i}`, i % 4 === 0 ? `North Caloocan City Hall Annex Building ${i}` : `Stop ${i}`),
    ),
  },
};
