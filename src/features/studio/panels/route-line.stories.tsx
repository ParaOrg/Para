import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import type { TimelineRow } from '@/features/routes/model/timeline';

import { RouteLine } from './route-line';

const row = (label: string, kind: TimelineRow['kind'] = 'hintuan'): TimelineRow => ({
  id: label.toLowerCase().replace(/\W+/g, '-'),
  label,
  kind,
});

// MRT-3's stations, as Figma draws the Route line (4614:15082).
const STATIONS = [
  'Quezon Avenue',
  'Kamuning',
  'Santolan-Annapolis',
  'Ortigas',
  'Shaw Boulevard',
  'Boni',
  'Guadalupe',
  'Buendia',
  'Ayala',
  'Magallanes',
].map((name) => row(name));

const meta = {
  title: 'Features/Studio/RouteLine',
  component: RouteLine,
  // At the sidebar's width, 348 inside its 16 each side; the `phone` parameter at a handset's,
  // where the sheet over the map holds it.
  decorators: [
    (Story, ctx) => (
      <div
        className={'bg-surface font-sn-pro ' + (ctx.parameters.phone ? 'w-97.5 p-6' : 'w-95 p-4')}
      >
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: {
    timeline: {
      from: row('North Avenue', 'terminal'),
      between: STATIONS,
      to: row('Taft Avenue', 'terminal'),
    },
  },
} satisfies Meta<typeof RouteLine>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Twelve places: folded to the first three under a fade, with View more (Figma 4300:20893). */
export const Folded: Story = {
  play: async ({ canvasElement }) => {
    const more = within(canvasElement).getByRole('button', { name: 'View more' });
    await expect(more).toHaveAttribute('aria-expanded', 'false');
  },
};

/** Opened: every place, the first and last ringed, with View less (Figma 4614:15082). */
export const Opened: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'View more' }));
    await expect(canvas.getByRole('button', { name: 'View less' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(canvas.getAllByRole('listitem')).toHaveLength(12);
  },
};

/** Three places or fewer: all of them, and nothing to fold. */
export const Short: Story = {
  args: {
    timeline: {
      from: row('Tala', 'terminal'),
      between: [row('Bagong Silang')],
      to: row('SM Fairview', 'terminal'),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole('listitem')).toHaveLength(3);
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

/** The two ends only: a line between them with no hintuan yet. */
export const EndsOnly: Story = {
  args: {
    timeline: { from: row('Tala', 'terminal'), between: [], to: row('SM Fairview', 'terminal') },
  },
};

/** A long place name wraps at the sidebar's width; it is never cut. */
export const LongNames: Story = {
  args: {
    timeline: {
      from: row('Robinsons Novaliches Transport Terminal, beside the overpass', 'terminal'),
      between: [row('Quirino Highway corner Zabarte Road, by the waiting shed')],
      to: row('SM City Fairview Jeepney Terminal, Regalado Avenue side', 'terminal'),
    },
  },
};

/** One place only, while the line reaches its first: a lone ringed dot, no rail. */
export const OnePlace: Story = {
  args: { timeline: { from: row('Tala', 'terminal'), between: [], to: null } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole('listitem')).toHaveLength(1);
  },
};

/** At a phone's width, in the sheet over the map, folded. */
export const Phone: Story = {
  parameters: { phone: true },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
