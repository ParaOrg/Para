import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { CARD_SURFACE, CARD_TEXT } from './livery-card';
import { RouteCardEndPoint } from './route-card-end-point';

/**
 * Figma's .RouteEndPointBar, variant RouteCard (3656:131): a card's row at Rest, the tree line
 * before it, 40 tall. Pressed (3848:11928) is a browser state, `:active`: hold a row to see it.
 */
const meta = {
  title: 'Features/Routes/RouteCardEndPoint',
  component: RouteCardEndPoint,
  args: { routeDirection: 'SM Fairview', livery: 'red', position: 'top', onClick: fn() },
  decorators: [
    (Story, { args }) => (
      <div className={'w-96 ' + CARD_SURFACE[args.livery] + ' ' + CARD_TEXT[args.livery]}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RouteCardEndPoint>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Position=Top: a row with more rows below, the line running on past its arrow. */
export const Top: Story = {
  play: async ({ canvasElement, args }) => {
    const row = within(canvasElement).getByRole('button', { name: 'SM Fairview' });
    await expect(row.getBoundingClientRect().height).toBe(40);
    await userEvent.click(row);
    await expect(args.onClick).toHaveBeenCalled();
  },
};

/** Position=Bottom: the last row, the line ending at its arrow. */
export const Bottom: Story = { args: { position: 'bottom' } };

/** The same row on an orange card. */
export const OnOrange: Story = { args: { livery: 'orange' } };

/** Pressed, forced here with the pressed fill: Card/red/Timeline/surface. */
export const Pressed: Story = { args: { className: 'bg-card-red-timeline-surface' } };

/** A long place wraps under itself, the line stretching to the row's height. */
export const LongName: Story = {
  args: { routeDirection: 'Bagong Silang Kanan 5 Phase 3 Package 2 Terminal' },
};

/** On MRT-3's yellow the row's tree line takes the card's dark words. */
export const OnDarkWords: Story = { args: { livery: 'metro-rail-way-three', position: 'bottom' } };
