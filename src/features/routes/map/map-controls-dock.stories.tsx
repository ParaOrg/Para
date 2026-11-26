import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps, ReactNode } from 'react';
import { expect, fn, within } from 'storybook/test';

import { FilterIcon } from '@/shared/ui/map-control-icons';

import { MapControlsDock } from './map-controls-dock';
import { OverviewPill } from './overview-pill';
import { ModeFilterButton } from '../cards/mode-filter-button';
import { ViceVersaButton } from '../cards/vice-versa-button';

type Shows = 'list' | 'trip' | 'list-off-overview';

interface DockProps extends Omit<ComponentProps<typeof MapControlsDock>, 'children'> {
  /** The card on show: the route list, a trip, or the list with a card picked and the camera off it. */
  shows: Shows;
}

/** The dock with the controls the public map stands in it for each card (MapSheetControls). */
function Dock({ shows, ...props }: DockProps) {
  const isList = shows !== 'trip';
  return (
    <MapControlsDock {...props}>
      {isList && (
        <ViceVersaButton
          way="Papunta"
          wayTo="Pabalik"
          isSwitchable
          isBack={false}
          onSwitch={fn()}
        />
      )}
      <OverviewPill isShown={shows !== 'list'} go={fn()} map={null} />
      {isList && (
        <span className="flex rounded-full shadow-sm">
          <ModeFilterButton
            modeFilter={{ filter: 'all', onFilter: fn() }}
            icon={<FilterIcon />}
            tooltip="left"
            testId="chooser-filter"
          />
        </span>
      )}
    </MapControlsDock>
  );
}

/**
 * The controls over a phone's map (Figma 4831:54489), 393 wide, a card's sheet up from the bottom:
 * they stand `--dock-gap` over the sheet at the left edge, the map's ⓘ in the top-left corner
 * (drawn here as its 32 box).
 * The sheet's top is set as BottomSheet sets it (`--dock-y`), at 60% of the frame.
 */
const meta = {
  title: 'Features/Routes/MapControlsDock',
  component: Dock,
  args: { shows: 'list' },
  decorators: [
    (Story, { parameters }) =>
      parameters.ownFrame === true ? (
        <Story />
      ) : (
        <div
          data-dock-host
          className="@container relative h-160 w-98.25 overflow-hidden bg-bg-surface-secondary [--dock-y:60%]"
        >
          <div className="absolute inset-x-0 top-[60%] bottom-0 rounded-t-3xl bg-bg-surface" />
          <div className="absolute top-3 left-3 size-8 rounded-full bg-bg-surface" />
          <Story />
        </div>
      ),
  ],
} satisfies Meta<typeof Dock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The route list on show (4796:34329): the sliders over Vice Versa, Vice Versa nearest the sheet. */
export const List: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const viceVersa = canvas.getByRole('button', { name: 'Vice Versa' });
    const filter = canvas.getByRole('button', { name: 'Filter' });
    await expect(filter.getBoundingClientRect().bottom).toBeLessThan(
      viceVersa.getBoundingClientRect().top,
    );
  },
};

/** A trip on show (4831:51289), the camera off its route: Overview alone. */
export const Trip: Story = { args: { shows: 'trip' } };

/** The list with the camera moved off it: the Overview over Vice Versa, the sliders over that. */
export const ListOffTheOverview: Story = { args: { shows: 'list-off-overview' } };

interface WideFrameProps {
  children: ReactNode;
}

/** The frame a wide map draws, the card docked 384 wide on the left, the controls 8 right of it. */
function WideFrame({ children }: WideFrameProps) {
  return (
    <div
      data-dock-host
      className="@container relative h-160 w-275 overflow-hidden bg-bg-surface-secondary"
    >
      <div className="absolute inset-y-0 left-0 w-96 bg-bg-surface" />
      {children}
    </div>
  );
}

/**
 * A desktop's map (4886:47571, 64rem and over): a row at the map's top, 16 right of the docked
 * list, Vice Versa first and the filter 12 right of it. Not following the sheet.
 */
export const Desktop: Story = {
  parameters: { ownFrame: true },
  decorators: [
    (Story) => (
      <WideFrame>
        <Story />
      </WideFrame>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const viceVersa = canvas.getByRole('button', { name: 'Vice Versa' });
    const filter = canvas.getByRole('button', { name: 'Filter' });
    const [a, b] = [viceVersa.getBoundingClientRect(), filter.getBoundingClientRect()];
    await expect(Math.round(b.left - a.right)).toBe(12);
    await expect(Math.abs(b.top - a.top)).toBeLessThan(1);
  },
};

/** A trip on a desktop's map (Figma 4831:53879): Overview at the top, beside the docked trip. */
export const DesktopTrip: Story = {
  args: { shows: 'trip' },
  parameters: { ownFrame: true },
  decorators: Desktop.decorators,
};
