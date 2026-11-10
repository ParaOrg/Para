import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { RouteCard, type RouteCardRide } from '@/features/routes/cards/route-card';
import { isRoadLivery, type Livery, type RoadLivery } from '@/features/routes/model/liveries';
import type { RailwayVehicle } from '@/features/routes/model/vehicles';

import { ContributionCard } from './contribution-card';

/** The line that wears each train or ferry livery. */
const RAILWAY_OF = {
  'light-rail-way-one': 'LRT-1',
  'light-rail-way-two': 'LRT-2',
  'metro-rail-way-three': 'MRT-3',
  ferry: 'Ferry',
} satisfies Record<Exclude<Livery, RoadLivery>, RailwayVehicle>;

/** The card as it sits in the list: right after the last route card, in that card's livery. */
function AfterRouteCard({ livery, origin }: { livery: Livery; origin: string }) {
  const ride: RouteCardRide = isRoadLivery(livery)
    ? { kind: 'road', livery }
    : { kind: 'rail', railway: RAILWAY_OF[livery], bound: null, originCode: null };
  return (
    <div className="w-97.5">
      <RouteCard
        ride={ride}
        state="rest"
        routeOrigin={origin}
        endPoints={[
          {
            id: 'a',
            routeDirection: 'Tala',
            vehicle: ride.kind === 'rail' ? ride.railway : 'Jeepney',
            stationCode: null,
          },
        ]}
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
  args: { livery: 'bus' },
  render: ({ livery }) => <AfterRouteCard livery={livery} origin="Novaliches (Bayan)" />,
} satisfies Meta<typeof ContributionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** After a Bus card: the Primary blob, which Jeep and the train lines reuse. The card is empty and hidden from assistive technology. */
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

/** After an E-Jeep card, whose blob is the brighter Inverse one. */
export const AfterEjeepCard: Story = {
  args: { livery: 'ejeep' },
  render: ({ livery }) => <AfterRouteCard livery={livery} origin="Fairview" />,
};
