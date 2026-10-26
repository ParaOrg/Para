import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { RouteCard } from '@/features/routes/cards/route-card';
import type { Livery } from '@/features/routes/model/liveries';

import { ContributionCard } from './contribution-card';

/** The card as it sits in the list: right after the last route card, in that card's livery. */
function AfterRouteCard({ livery, origin }: { livery: Livery; origin: string }) {
  return (
    <div className="w-97.5">
      <RouteCard
        livery={livery}
        state="rest"
        routeOrigin={origin}
        endPoints={[{ id: 'a', routeDirection: 'Tala', vehicle: 'Jeepney' }]}
        onSelect={() => undefined}
        onPick={() => undefined}
        testId="chooser"
      />
      <ContributionCard livery={livery} />
    </div>
  );
}

const meta = {
  title: 'App/PublicMap/ContributionCard',
  component: ContributionCard,
  args: { livery: 'orange' },
  render: ({ livery }) => <AfterRouteCard livery={livery} origin="Novaliches (Bayan)" />,
} satisfies Meta<typeof ContributionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** After a red jeepney card (orange is the livery's name): the Primary blob. The other jeepney liveries and LRT lines reuse these blobs. The card is empty and hidden from assistive technology. */
export const AfterJeepneyCard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('link')).toBeNull();
    await expect(canvas.getByTestId('contribution-card')).toHaveAttribute('aria-hidden', 'true');
  },
};

/** After MRT-3's yellow card. */
export const AfterMetroRailWayThreeCard: Story = {
  args: { livery: 'metro-rail-way-three' },
  render: ({ livery }) => <AfterRouteCard livery={livery} origin="Taft Avenue" />,
};

/** After a ferry's blue card. */
export const AfterFerryCard: Story = {
  args: { livery: 'ferry' },
  render: ({ livery }) => <AfterRouteCard livery={livery} origin="Escolta" />,
};

/** After a violet card, whose blob is the brighter Inverse one. */
export const AfterVioletCard: Story = {
  args: { livery: 'violet' },
  render: ({ livery }) => <AfterRouteCard livery={livery} origin="Fairview" />,
};
