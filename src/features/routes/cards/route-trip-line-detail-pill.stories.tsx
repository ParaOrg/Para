import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { CARD_SURFACE } from './livery-card';
import { RouteTripLineDetailPill } from './route-trip-line-detail-pill';
import { LIVERIES } from '../model/liveries';

/**
 * The pill beside a picked hintuan, on its card's colour, as the timeline
 * shows it: that colour is the divider between Two's halves. Sample
 * codes and pesos, not the real fares.
 */
const meta = {
  title: 'Features/Routes/RouteTripLineDetailPill',
  component: RouteTripLineDetailPill,
  render: (args) => (
    <div className={'inline-flex p-3 ' + CARD_SURFACE[args.livery]}>
      <RouteTripLineDetailPill {...args} />
    </div>
  ),
  args: { livery: 'metro-rail-way-three', code: 'YL06', pesos: '₱13' },
} satisfies Meta<typeof RouteTripLineDetailPill>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two (4161:8298), on a train: the station's code and the pesos, two halves 2 px apart. */
export const Two: Story = {
  play: async ({ canvasElement }) => {
    const code = canvasElement.querySelector('[data-part="code"]')?.getBoundingClientRect();
    const pesos = canvasElement.querySelector('[data-part="pesos"]')?.getBoundingClientRect();
    await expect(code && pesos && pesos.left - code.right).toBe(2);
  },
};

/** One (4161:8300), on a jeep: the pesos alone. Red, the livery Figma draws it in. */
export const One: Story = { args: { livery: 'red', code: null, pesos: '₱13' } };

/**
 * A train's start alone (Figma Variant3, 4148:12161): no end picked, no ride to price, the
 * station's code alone in One's shape.
 */
export const CodeAlone: Story = { args: { code: 'YL07', pesos: undefined } };

/** Two with a range, the longest pesos a ride shows: pesoRange's en dash. */
export const TwoRange: Story = { args: { pesos: '₱13–24' } };

/** One with a range. */
export const OneRange: Story = { args: { livery: 'red', code: null, pesos: '₱13–24' } };

/** Every livery: One on each, and Two on each, each on its own card's colour. */
export const EveryLivery: Story = {
  render: () => (
    <div className="flex flex-col gap-1">
      {LIVERIES.map((livery) => (
        <div key={livery} className={'flex gap-3 p-3 ' + CARD_SURFACE[livery]}>
          <RouteTripLineDetailPill livery={livery} code={null} pesos="₱13–24" />
          <RouteTripLineDetailPill livery={livery} code="YL06" pesos="₱13–24" />
        </div>
      ))}
    </div>
  ),
};

/** On a phone: the width of the app's root, a container as the app's is. */
export const Phone: Story = {
  render: (args) => (
    <div className={'@container flex w-[390px] justify-end p-4 ' + CARD_SURFACE[args.livery]}>
      <RouteTripLineDetailPill {...args} />
    </div>
  ),
};
