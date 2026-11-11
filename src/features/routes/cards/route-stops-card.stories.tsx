import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ROW_PRESSED, TIMELINE_SURFACE } from './livery-card';
import { RouteStopsCard } from './route-stops-card';
import { RouteStopsCardHeader } from './route-stops-card-header';
import { TimelineBottomEndRoute } from './timeline-bottom-end-route';
import { TimelineHintuan } from './timeline-hintuan';
import { TimelineTop } from './timeline-top';
import { LIVERIES, type Livery } from '../model/liveries';

/**
 * The trip's stops in RouteStopsCard (4681:29139), with the timeline's own rows, every one shown,
 * on Figma's places. The rows' picks and folds are TimelineRouteDetail's stories.
 */
function Stops({ livery, places }: { livery: Livery; places: readonly string[] }) {
  const rail = TIMELINE_SURFACE[livery];
  const pressed = ROW_PRESSED[livery];
  const [origin = '', ...rest] = places;
  const destination = rest.pop() ?? '';
  return (
    <ol className="flex w-full flex-col">
      <TimelineTop
        livery={livery}
        rail={rail}
        pressed={pressed}
        routeOrigin={origin}
        mark="start"
        pill={null}
        state="rest"
        selected={false}
        onTap={fn()}
      />
      {rest.map((label) => (
        <TimelineHintuan
          key={label}
          id={label}
          rail={rail}
          pressed={pressed}
          label={label}
          selected={false}
          pill={null}
          livery={livery}
          state="rest"
          mark={null}
          action={null}
          isFolded={false}
          onPick={fn()}
        />
      ))}
      <TimelineBottomEndRoute
        livery={livery}
        rail={rail}
        pressed={pressed}
        routeDirection={destination}
        isEnd
        pill={null}
        state="rest"
        isFolded={false}
        selected={false}
        onTap={fn()}
      />
    </ol>
  );
}

const VEHICLE_OF = {
  jeep: 'Jeepney',
  'uv-express': 'UV Express',
  ejeep: 'E-Jeep',
  bus: 'Bus',
  'light-rail-way-one': 'LRT-1',
  'light-rail-way-two': 'LRT-2',
  'metro-rail-way-three': 'MRT-3',
  ferry: 'Ferry',
} as const satisfies Record<Livery, string>;

const TALA = [
  'Tala',
  'Barracks',
  'Malaria',
  'Pangarap',
  'Amparo',
  'Fatima',
  'Lagro',
  'SM Fairview',
];

const meta = {
  title: 'Features/Routes/RouteStopsCard',
  component: RouteStopsCard,
  parameters: { layout: 'fullscreen' },
  // As the trip insets it on a phone: 12 from each side of Figma's 393.
  decorators: [
    (Story) => (
      <div className="w-98.25 bg-surface px-3 pt-3 pb-10">
        <Story />
      </div>
    ),
  ],
  args: {
    livery: 'jeep',
    header: <RouteStopsCardHeader vehicle="Jeepney" bound={null} livery="jeep" />,
    children: <Stops livery="jeep" places={TALA} />,
  },
} satisfies Meta<typeof RouteStopsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Variants=Maximize, as Figma draws it: every stop shown, and "View less" on the card's foot. */
export const Maximize: Story = {
  args: { isMaximized: true, onToggleStops: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Jeep')).toBeVisible();
    const viewLess = canvas.getByRole('button', { name: 'View less' });
    await expect(viewLess).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(viewLess);
    await expect(args.onToggleStops).toHaveBeenCalledTimes(1);
    // Rounded 24, as Figma's radius/3xl.
    const card = canvas.getByTestId('trip');
    await expect(getComputedStyle(card).borderTopLeftRadius).toBe('24px');
  },
};

/** Folded: "View more", its chevron down; the tap is the caller's to keep. */
export const ViewMore: Story = {
  render: function Render(args) {
    const [isMaximized, setIsMaximized] = useState(false);
    return (
      <RouteStopsCard
        {...args}
        isMaximized={isMaximized}
        onToggleStops={() => setIsMaximized((m) => !m)}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'View more' }));
    await expect(canvas.getByRole('button', { name: 'View less' })).toBeVisible();
  },
};

/** Nothing folds: no button on its foot. */
export const NothingFolded: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByTestId('trip-view-more')).toBeNull();
  },
};

/** A train: its line's badge and its bound's, in the line's colours. */
export const LightRailWayOne: Story = {
  args: {
    livery: 'light-rail-way-one',
    header: <RouteStopsCardHeader vehicle="LRT-1" bound="Southbound" livery="light-rail-way-one" />,
    children: (
      <Stops
        livery="light-rail-way-one"
        places={['Fernando Poe Jr.', 'Balintawak', 'Monumento', 'Dr. Santos']}
      />
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('LRT 1')).toBeVisible();
    await expect(canvas.getByText('Southbound')).toBeVisible();
  },
};

/** Every livery, each lifted in its own colour (RouteStopsCardShadow). */
export const EveryLivery: Story = {
  decorators: [
    (Story) => (
      <div className="flex w-98.25 flex-col gap-6 bg-surface px-3 pt-3 pb-10">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      {LIVERIES.map((livery) => (
        <RouteStopsCard
          key={livery}
          livery={livery}
          header={
            <RouteStopsCardHeader vehicle={VEHICLE_OF[livery]} bound={null} livery={livery} />
          }
          isMaximized
          onToggleStops={fn()}
        >
          <Stops livery={livery} places={['Tala', 'Malaria', 'SM Fairview']} />
        </RouteStopsCard>
      ))}
    </>
  ),
};

/** A long place wraps; the badge's words never do. */
export const LongNames: Story = {
  args: {
    children: (
      <Stops
        livery="jeep"
        places={[
          'Fairview Teraccess Transport Terminal',
          'Novaliches (Bayan) via Zabarte',
          'Lagro',
        ]}
      />
    ),
  },
};
