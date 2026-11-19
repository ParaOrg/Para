import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { TripRidePills } from './trip-ride-pills';

/** What a trip rides, at the top of its panel, on a phone-wide sheet (BottomContent, 4796:30124). */
const meta = {
  title: 'Features/Routes/TripRidePills',
  component: TripRidePills,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="w-98.25 bg-bg-surface p-4">
        <Story />
      </div>
    ),
  ],
  args: { vehicle: 'Jeepney', bound: null, livery: 'jeep' },
} satisfies Meta<typeof TripRidePills>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As Figma draws it: the jeep in its blue, and "Jeep". A label: no button, no tab stop. */
export const Jeep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pill = canvas.getByTestId('trip-mode');
    await expect(pill).toHaveTextContent('Jeep');
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(pill.tabIndex).toBe(-1);
  },
};

export const EJeep: Story = { args: { vehicle: 'E-Jeep', livery: 'ejeep' } };

export const Bus: Story = { args: { vehicle: 'Bus', livery: 'bus' } };

export const UvExpress: Story = { args: { vehicle: 'UV Express', livery: 'uv-express' } };

export const Ferry: Story = { args: { vehicle: 'Ferry', livery: 'ferry' } };

/** A train: its line and its bound, "LRT 1 · Northbound". */
export const Lrt1: Story = {
  args: { vehicle: 'LRT-1', bound: 'Northbound', livery: 'light-rail-way-one' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('trip-mode')).toHaveTextContent(
      'LRT 1 · Northbound',
    );
  },
};

export const Lrt2: Story = {
  args: { vehicle: 'LRT-2', bound: 'Eastbound', livery: 'light-rail-way-two' },
};

export const Mrt3: Story = {
  args: { vehicle: 'MRT-3', bound: 'Southbound', livery: 'metro-rail-way-three' },
};
