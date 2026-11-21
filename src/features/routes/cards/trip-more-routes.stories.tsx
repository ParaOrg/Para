import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { TripEndsCard } from './trip-ends-card';
import { TripMoreRoutes, type OtherRoute } from './trip-more-routes';

/** Where the trip starts: on its ends card and in the open list's heading, as the app passes both. */
const ORIGIN = 'B. Silang Phase 5';

const ROUTES: readonly OtherRoute[] = [
  { id: 'mrt', to: 'MRT MCDO (Quezon Avenue Station)', via: null },
  { id: 'bayan', to: 'Novaliches (Bayan)', via: null },
  { id: 'philcoa-almar', to: 'Philcoa', via: 'Almar' },
  { id: 'philcoa-maligaya', to: 'Philcoa', via: 'Maligaya' },
  { id: 'quiapo', to: 'Quiapo', via: null },
  { id: 'sm', to: 'SM Fairview', via: 'Almar' },
];

/**
 * The top of a trip's detail on a phone-wide sheet (RouteDetail, 4796:30411): its ends on the band,
 * and the tab to the other routes out of where it starts. Sample routes only.
 */
const meta = {
  title: 'Features/Routes/TripMoreRoutes',
  component: TripMoreRoutes,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="w-98.25 bg-bg-surface">
        <Story />
      </div>
    ),
  ],
  args: {
    ends: <TripEndsCard routeOrigin={ORIGIN} routeDirection="SM Fairview" via="Maligaya" />,
    from: ORIGIN,
    routes: ROUTES,
    onRoute: fn(),
    children: <p className="px-4 py-6 text-sm/5 text-text-tertiary">The rest of the trip</p>,
  },
} satisfies Meta<typeof TripMoreRoutes>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed, as Figma's Variant2 draws it: "View 6 more destinations" hanging under the ends card. */
export const Closed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tab = canvas.getByRole('button', { name: 'View 6 more destinations' });
    await expect(tab).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.getByTestId('trip-other-routes')).not.toBeVisible();
  },
};

/** Open, as Figma's Default draws it: the list, then "View less" on the panel's edge. */
export const Open: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const tab = canvas.getByTestId('trip-more-routes');
    await userEvent.click(tab);
    await expect(tab).toHaveAttribute('aria-expanded', 'true');
    await expect(tab).toHaveAccessibleName('View less');
    await expect(tab).toHaveFocus();
    const list = canvas.getByTestId('trip-other-routes');
    await expect(list).toBeVisible();
    await expect(tab.getAttribute('aria-controls')).toBe(list.id);
    await expect(within(list).getByText(`6 more destinations from ${ORIGIN}`)).toBeVisible();
    await expect(within(list).getByText('via Maligaya')).toBeVisible();
    await userEvent.click(within(list).getByRole('button', { name: /^Quiapo/ }));
    await expect(args.onRoute).toHaveBeenCalledWith('quiapo');
  },
};

/** From the keyboard: Enter opens it, Space closes it, and focus stays on the tab throughout. */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const tab = within(canvasElement).getByTestId('trip-more-routes');
    tab.focus();
    await userEvent.keyboard('{Enter}');
    await expect(tab).toHaveAttribute('aria-expanded', 'true');
    await expect(tab).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(tab).toHaveAttribute('aria-expanded', 'false');
    await expect(tab).toHaveFocus();
  },
};

/** One other route: "View 1 more destination", its row the End one. */
export const One: Story = {
  args: { routes: ROUTES.slice(0, 1) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'View 1 more destination' }));
    await expect(canvas.getByText(`1 more destination from ${ORIGIN}`)).toBeVisible();
  },
};

/** None: the band alone, no tab and no list. */
export const None: Story = {
  args: { routes: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByTestId('trip-more-routes')).toBeNull();
    await expect(canvas.queryByTestId('trip-other-routes')).toBeNull();
  },
};

/** Long places wrap. */
export const LongNames: Story = {
  args: {
    routes: [
      {
        id: 'long',
        to: 'Bagong Silang Kanan 5 Phase 3 Package 2 Terminal',
        via: 'Zabarte and Quirino Highway',
      },
    ],
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByTestId('trip-more-routes'));
  },
};
