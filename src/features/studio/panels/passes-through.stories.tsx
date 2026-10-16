import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { groupBySignboard, type ListedDirection } from './hotspot-checks';
import { PassesThrough } from './passes-through';
import { PANEL } from './sheet';

/** Sample directions only, as the lists read them. Not read from Supabase. */
/** One route's two ways, under its generated name. */
const route = (routeId: string, routeName: string, from: string, to: string): ListedDirection[] =>
  [`${from} → ${to}`, `${to} → ${from}`].map((name, i) => ({
    id: `${routeId}-${i}`,
    routeId,
    name,
    route: { name: routeName },
  }));

/**
 * A hintuan's routes on the hotspot panel (HotspotPanel): the directions that
 * pass under the outline, read-only — the polygon decides.
 */
const meta = {
  title: 'Features/Studio/PassesThrough',
  component: PassesThrough,
  decorators: [
    (Story) => (
      <div className={PANEL}>
        <Story />
      </div>
    ),
  ],
  args: {
    groups: groupBySignboard([
      ...route('tala', 'Tala – SM Fairview', 'Tala', 'SM Fairview'),
      ...route('novaliches', 'Novaliches – SM Fairview', 'Novaliches', 'SM Fairview'),
    ]),
  },
} satisfies Meta<typeof PassesThrough>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two routes pass under it, each with its two ways on one line. */
export const AFewRoutes: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Tala – SM Fairview')).toBeVisible();
    await expect(canvas.getByText(/Tala → SM Fairview · SM Fairview → Tala/)).toBeVisible();
  },
};

/** No saved route passes under it yet. */
export const Empty: Story = {
  args: { groups: [] },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText(/No saved route passes under this outline yet/),
    ).toBeVisible();
  },
};

/**
 * At a phone's width, in the panel's full-screen sheet, the ways wrapping
 * under their route: the sheet follows the viewport, not this box.
 */
export const Phone: Story = {
  parameters: { phone: true },
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};
