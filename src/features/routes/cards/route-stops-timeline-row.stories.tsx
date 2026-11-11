import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { CARD_SURFACE, CARD_TEXT, TIMELINE_SURFACE } from './livery-card';
import { RouteBadge } from './route-badge';
import { RouteStopSign } from './route-stop-sign';
import {
  RouteStopsTimelineRow,
  type TimelineRowSize,
  type TimelineRowState,
  type TimelineRowVariant,
} from './route-stops-timeline-row';
import type { Livery } from '../model/liveries';

const meta = {
  title: 'Features/Routes/RouteStopsTimelineRow',
  component: RouteStopsTimelineRow,
  parameters: { layout: 'fullscreen' },
  args: {
    variant: 'middle',
    state: 'rest',
    rail: TIMELINE_SURFACE.jeep,
    label: 'Label',
  },
} satisfies Meta<typeof RouteStopsTimelineRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every place and state Figma's set draws (4611:10957), at one size. */
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

function Column({ size, livery }: { size: TimelineRowSize; livery: Livery }) {
  return (
    <div
      className={
        'flex w-66 flex-col py-2 font-sn-pro ' + CARD_SURFACE[livery] + ' ' + CARD_TEXT[livery]
      }
    >
      {SET.map(([variant, state]) => (
        <div key={variant + state} data-testid={`row-${variant}-${state}`}>
          <RouteStopsTimelineRow
            variant={variant}
            state={state}
            size={size}
            rail={TIMELINE_SURFACE[livery]}
            label={`${variant} · ${state}`}
          />
        </div>
      ))}
    </div>
  );
}

/** The set at both sizes on a jeep card: Large rows 44 tall, Small 40. */
export const Set: Story = {
  render: () => (
    <div className="flex gap-4 p-4">
      <Column size="large" livery="jeep" />
      <Column size="small" livery="jeep" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [large] = within(canvasElement).getAllByTestId('row-middle-rest');
    await expect(large?.getBoundingClientRect().height).toBe(44);
  },
};

/** On MRT 3's yellow, dark words and a dark chip and signs (4687:8254). */
export const MetroRailWayThree: Story = {
  render: () => (
    <div className="p-4">
      <Column size="large" livery="metro-rail-way-three" />
    </div>
  ),
};

/** The slot: S and the station's code on the first stop, E and its code on the last. */
export const Slot: Story = {
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      {(['jeep', 'metro-rail-way-three', 'uv-express'] as const).map((livery) => (
        <div
          key={livery}
          className={
            'flex w-92.25 flex-col py-2 font-sn-pro ' +
            CARD_SURFACE[livery] +
            ' ' +
            CARD_TEXT[livery]
          }
        >
          <RouteStopsTimelineRow
            variant="top"
            state="rest"
            rail={TIMELINE_SURFACE[livery]}
            label="Tala"
            slot={
              <>
                <RouteStopSign kind="start" livery={livery} />
                <RouteBadge label="PL01" livery={livery} />
              </>
            }
          />
          <RouteStopsTimelineRow
            variant="bottom"
            state="rest"
            rail={TIMELINE_SURFACE[livery]}
            label="SM Fairview"
            slot={
              <>
                <RouteStopSign kind="end" livery={livery} />
                <RouteBadge label="PL13" livery={livery} />
              </>
            }
          />
        </div>
      ))}
    </div>
  ),
};
