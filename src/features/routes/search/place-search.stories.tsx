import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { PlaceSearch } from './place-search';
import type { Hotspot } from '../model/hotspots';

const hotspot = (
  id: string,
  name: string,
  informal: string | null,
  at: [number, number],
  { aliases = [], kind = 'hintuan' }: { aliases?: string[]; kind?: Hotspot['kind'] } = {},
): Hotspot => ({
  id,
  name,
  informal,
  aliases,
  kind,
  point: { type: 'Point', coordinates: at },
  area: null,
  note: null,
  createdAt: '2026-01-01T00:00:00Z',
  line: null,
});

const HOTSPOTS: Hotspot[] = [
  hotspot('t1', 'SM Fairview Terminal B', 'SM Fairview', [121.06, 14.733], {
    kind: 'terminal',
    aliases: ['SM City Fairview'],
  }),
  hotspot('h1', 'SM Fairview Hintuan', 'SM Fairview', [121.061, 14.734], { aliases: ['Fairview'] }),
  hotspot('h2', 'Quiapo Church', 'Quiapo', [120.984, 14.599]),
  hotspot('t2', 'Parañaque Integrated Terminal Exchange', 'PITX', [120.992, 14.51], {
    kind: 'terminal',
  }),
  hotspot('h3', 'Cubao Farmers', 'Cubao', [121.054, 14.619]),
  hotspot('h4', 'Cubao Gateway', 'Gateway Cubao', [121.053, 14.621]),
];

const LONG_NAMES: Hotspot[] = [
  hotspot(
    'l1',
    'Polytechnic University of the Philippines Sta. Mesa Main Campus Gate 2 Hintuan',
    'Polytechnic University of the Philippines Santa Mesa',
    [121.01, 14.598],
    { aliases: ['PUP Sta. Mesa Main Campus along Anonas Street Extension'] },
  ),
  hotspot('l2', 'Pureza LRT-2 Station Hintuan', 'Pureza', [121.005, 14.601]),
];

const meta = {
  title: 'Features/Routes/PlaceSearch',
  component: PlaceSearch,
  args: { hotspots: HOTSPOTS, onPick: fn() },
  decorators: [
    (Story) => (
      <div className="w-80 bg-surface-tertiary p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PlaceSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

const field = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole('combobox', { name: 'Search places' });

/** Nothing typed: the field alone. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(field(canvasElement)).toHaveAttribute('aria-expanded', 'false');
    await expect(within(canvasElement).queryByRole('listbox')).toBeNull();
  },
};

/**
 * A few letters in: the places they start, best match first, each with the name that matched
 * under its label when that name is another (Gateway Cubao's box is "Cubao Gateway").
 */
export const Typing: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'cub');
    const options = within(canvasElement).getAllByRole('option');
    await expect(options.map((option) => option.textContent)).toEqual([
      'Cubao',
      'Gateway CubaoCubao Gateway',
    ]);
  },
};

/** An alias and a typo find their places; the arrows and Enter choose one, and the field empties. */
export const Results: Story = {
  play: async ({ args, canvasElement }) => {
    const input = field(canvasElement);
    await userEvent.type(input, 'fairveiw');
    await expect(within(canvasElement).getAllByRole('option')[0]).toHaveTextContent('SM Fairview');
    await userEvent.keyboard('{ArrowDown}');
    await expect(within(canvasElement).getAllByRole('option')[0]).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.keyboard('{Enter}');
    await expect(args.onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
    await expect(input).toHaveValue('');
  },
};

/** The arrow keys on a row, left there: the active row's look, which Enter would open. */
export const ResultActive: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'cubao');
    await userEvent.keyboard('{ArrowDown}');
    const [first] = within(canvasElement).getAllByRole('option');
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await expect(field(canvasElement)).toHaveAttribute('aria-activedescendant', first.id);
  },
};

/** Located: each result says how far it is. */
export const Located: Story = {
  args: { whereNow: () => [121.0531, 14.6211] },
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'terminal');
    await expect(within(canvasElement).getAllByRole('option')[0]).toHaveTextContent('km');
  },
};

/** Nothing matches: the empty state quotes what was typed. */
export const NoMatch: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'Monumento');
    await expect(within(canvasElement).getByText('No place called ‘Monumento’ yet')).toBeVisible();
    // No list is open, so the field says none is.
    await expect(field(canvasElement)).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{Escape}');
    await expect(field(canvasElement)).toHaveValue('');
  },
};

/** Long names and a long alias: each line truncates rather than pushing the distance off. */
export const LongNames: Story = {
  args: { hotspots: LONG_NAMES, whereNow: () => [121.0, 14.6] },
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'pu');
    await expect(within(canvasElement).getAllByRole('option')).toHaveLength(2);
  },
};

/** On a phone, as wide as the bar across a 390 map leaves the field; long names still truncate. */
export const LongNamesOnPhone: Story = {
  args: { hotspots: LONG_NAMES, whereNow: () => [121.0, 14.6] },
  decorators: [
    (Story) => (
      <div className="w-97.5 bg-surface-tertiary p-4">
        <div className="rounded-xl bg-surface p-3 shadow-large">
          <Story />
        </div>
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    await userEvent.type(field(canvasElement), 'pu');
    await expect(within(canvasElement).getAllByRole('option')).toHaveLength(2);
  },
};
