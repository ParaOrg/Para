import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { RouteBadge } from './route-badge';
import { RouteStopSign } from './route-stop-sign';
import {
  RouteStopsTimelineRow,
  type TimelineRowState,
  type TimelineRowVariant,
} from './route-stops-timeline-row';
import { TIMELINE_RAIL } from './timeline-look';
import type { Livery } from '../model/liveries';

const meta = {
  title: 'Features/Routes/RouteStopsTimelineRow',
  component: RouteStopsTimelineRow,
  parameters: { layout: 'fullscreen' },
  args: {
    variant: 'middle',
    state: 'rest',
    rail: TIMELINE_RAIL.jeep,
    label: 'Label',
  },
} satisfies Meta<typeof RouteStopsTimelineRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every place and state the timeline draws a row in, on the sheet's surface. */
const SET: readonly [TimelineRowVariant, TimelineRowState][] = [
  ['top', 'rest'],
  ['middle', 'rest'],
  ['bottom', 'rest'],
  ['top', 'selected'],
  ['middle', 'selectedTop'],
  ['middle', 'selectedBottom'],
  ['bottom', 'selected'],
  ['top', 'unselected'],
  ['middle', 'unselected'],
  ['bottom', 'unselected'],
];

function Column({ livery }: { livery: Livery }) {
  return (
    <div className="flex w-98.25 flex-col bg-bg-surface py-2 font-sn-pro">
      {SET.map(([variant, state]) => (
        <div key={variant + state} data-testid={`row-${variant}-${state}`}>
          <RouteStopsTimelineRow
            variant={variant}
            state={state}
            rail={TIMELINE_RAIL[livery]}
            label={`${variant} · ${state}`}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * The set on a jeep's rail (RouteHintuans, 4796:29755): a middle stop 54.6 tall, 10 over its name,
 * 20 under it and the hairline; the timeline's ends ringed at rest.
 */
export const Set: Story = {
  render: () => <Column livery="jeep" />,
  play: async ({ canvasElement }) => {
    const row = within(canvasElement).getByTestId('row-middle-rest');
    await expect(row.getBoundingClientRect().height).toBeCloseTo(54.6, 0);
  },
};

/**
 * Not drawn in Figma: the light liveries. UV Express's grey does not stand out from the surface,
 * and E-jeep has no card fill: their rail takes Text/primary (TIMELINE_RAIL).
 */
export const LightLiveries: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['uv-express', 'ejeep'] as const).map((livery) => (
        <Column key={livery} livery={livery} />
      ))}
    </div>
  ),
};

/** The slot under the name: Start and the station's code on the first stop, End and its code on the last. */
export const Slot: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(['jeep', 'metro-rail-way-three'] as const).map((livery) => (
        <div key={livery} className="flex w-98.25 flex-col bg-bg-surface py-2 font-sn-pro">
          <RouteStopsTimelineRow
            variant="top"
            state="rest"
            rail={TIMELINE_RAIL[livery]}
            label="Tala"
            slot={
              <>
                <RouteStopSign kind="start" />
                <RouteBadge label="PL01" livery={livery} />
              </>
            }
          />
          <RouteStopsTimelineRow
            variant="bottom"
            state="rest"
            rail={TIMELINE_RAIL[livery]}
            label="SM Fairview"
            slot={
              <>
                <RouteStopSign kind="end" />
                <RouteBadge label="PL13" livery={livery} />
              </>
            }
          />
        </div>
      ))}
    </div>
  ),
};

/** A long name wraps under itself, the dot by its first line. */
export const LongName: Story = {
  render: () => (
    <div className="flex w-98.25 flex-col bg-bg-surface py-2 font-sn-pro">
      <RouteStopsTimelineRow
        variant="middle"
        state="rest"
        rail={TIMELINE_RAIL.jeep}
        label="North Caloocan City Hall, across the Petron by the footbridge"
      />
    </div>
  ),
};
