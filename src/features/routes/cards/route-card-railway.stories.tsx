import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { RouteCardRailway } from './route-card-railway';

const meta = {
  title: 'Features/Routes/RouteCardRailway',
  component: RouteCardRailway,
  // As wide as the list in the top-left corner: the card fills whatever holds it.
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: {
    railway: 'LRT-1',
    bound: 'Southbound',
    state: 'rest',
    routeOrigin: 'Fernando Poe Jr.',
    endPoints: [{ id: 'a', routeDirection: 'Dr. Santos' }],
    onSelect: fn(),
    onPick: fn(),
    testId: 'chooser',
  },
} satisfies Meta<typeof RouteCardRailway>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The origin's Start and the row's End, on a line's card. */
const expectSigns = async (canvasElement: HTMLElement) => {
  const card = within(canvasElement);
  await expect(card.getByText('Start')).toBeVisible();
  await expect(card.getByTestId('chooser-item')).toHaveTextContent(/, End$/);
};

/** LRT 1: Map/Rail/LightRailWayOne, the train in a white chip, then the line's pill; the bound read out, not shown. */
export const LightRailWayOne: Story = {
  play: async ({ canvasElement }) => {
    const card = within(canvasElement);
    await expect(card.getByTestId('chooser-pill')).toHaveTextContent('LRT 1, Southbound');
    await expect(card.getByTestId('chooser-item')).toHaveTextContent('Dr. Santos, End');
    await expect(card.getByTestId('chooser-select').parentElement).toHaveTextContent('Start');
  },
};

/** LRT 2, Westbound to Recto PL01 (4257:13767). */
export const LightRailWayTwo: Story = {
  args: {
    railway: 'LRT-2',
    bound: 'Westbound',
    routeOrigin: 'Antipolo',
    endPoints: [{ id: 'a', routeDirection: 'Recto' }],
  },
  play: async ({ canvasElement }) => {
    await expectSigns(canvasElement);
  },
};

/** MRT 3: dark words on its yellow, the pill Content/primary with yellow words. */
export const MetroRailWayThree: Story = {
  args: {
    railway: 'MRT-3',
    bound: 'Southbound',
    routeOrigin: 'North Avenue',
    endPoints: [{ id: 'a', routeDirection: 'Taft Avenue' }],
  },
  play: async ({ canvasElement }) => {
    await expectSigns(canvasElement);
  },
};

/** Ferry: Map/Ferry, one pill with no bound, and no Start or End. */
export const Ferry: Story = {
  args: {
    railway: 'Ferry',
    bound: null,
    routeOrigin: 'Escolta',
    endPoints: [{ id: 'a', routeDirection: 'Pinagbuhatan' }],
  },
  play: async ({ canvasElement }) => {
    const card = within(canvasElement);
    await expect(card.getByTestId('chooser-pill')).toHaveTextContent(/^Ferry$/);
    await expect(card.getByTestId('chooser-item')).toHaveTextContent(/^Pinagbuhatan$/);
    await expect(card.queryByText('Start')).toBeNull();
    await expect(card.queryByText('End')).toBeNull();
  },
};

/** State=Selected: pressed in, as a RouteCard is; nothing else changes. */
export const Selected: Story = {
  args: { state: 'selected' },
};

/** Selected, MRT 3. */
export const MetroRailWayThreeSelected: Story = {
  args: { ...MetroRailWayThree.args, state: 'selected' },
};

/** Several stations one way: a row each, the tree line running down to the last. */
export const ManyStations: Story = {
  args: {
    railway: 'LRT-2',
    bound: 'Eastbound',
    routeOrigin: 'Recto',
    endPoints: [
      { id: 'a', routeDirection: 'Araneta Center-Cubao' },
      { id: 'b', routeDirection: 'Santolan' },
      { id: 'c', routeDirection: 'Antipolo' },
    ],
  },
};

/** A bound the line's table does not know: nothing more is read out after the line. */
export const NoBound: Story = {
  args: {
    bound: null,
    endPoints: [{ id: 'a', routeDirection: 'Somewhere' }],
  },
};

/** A long station name wraps under the pill row; at a sheet's Low it keeps one line. */
export const LongContent: Story = {
  args: {
    routeOrigin: 'Ninoy Aquino Avenue (Parañaque Integrated Terminal Exchange)',
    endPoints: [
      {
        id: 'a',
        routeDirection: 'Fernando Poe Jr. via Monumento and Balintawak',
      },
    ],
  },
};

/** A row opens its direction; the name selects the card. */
export const Picking: Story = {
  play: async ({ args, canvasElement }) => {
    const card = within(canvasElement);
    await userEvent.click(card.getByTestId('chooser-item'));
    await expect(args.onPick).toHaveBeenCalledWith('a');
    await userEvent.click(card.getByTestId('chooser-select'));
    await expect(args.onSelect).toHaveBeenCalled();
  },
};

/** At a phone's width, the list's own. */
export const Phone: Story = {
  decorators: [
    (Story) => (
      <div className="w-97.5">
        <Story />
      </div>
    ),
  ],
};
