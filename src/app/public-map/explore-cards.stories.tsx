import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { ExploreCards } from './explore-cards';

const meta = {
  title: 'App/PublicMap/ExploreCards',
  component: ExploreCards,
  parameters: { layout: 'fullscreen' },
  args: { onLocate: fn() },
} satisfies Meta<typeof ExploreCards>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A map, as the page holds the cards: its own container, and the host the locator reads. */
function mapOf(width: string) {
  return function OnMap(Story: () => React.JSX.Element) {
    return (
      <div data-dock-host className={`@container relative h-[852px] bg-surface-secondary ${width}`}>
        <Story />
      </div>
    );
  };
}

/** On a phone (FirstTime, 4848:33680): along the bottom, flush, edge to edge. */
export const OnPhone: Story = {
  decorators: [mapOf('w-98.25')],
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await canvas.getByRole('button', { name: 'Turn on location to see routes near you' }).click();
    await expect(args.onLocate).toHaveBeenCalledOnce();
    // No address to give yet: Donate is drawn, and does nothing.
    await expect(canvas.getByRole('button', { name: 'Donate' })).toBeDisabled();
    await expect(canvas.getByRole('heading', { name: 'Ways to explore our app' })).toBeVisible();
    await expect(canvas.getByRole('heading', { name: 'Help make Para better' })).toBeVisible();
  },
};

/** A narrow phone (320 wide): the lines wrap, and the cards grow up the map to hold them. */
export const OnNarrowPhone: Story = {
  decorators: [mapOf('w-80')],
};

/**
 * Where the cards float (Desktop RouteCard, 4852:35445): flush in the top-left corner, 384 wide.
 * The page's room for the place search bar (--sheet-float-top) does not move them.
 */
export const OnWideMap: Story = {
  decorators: [mapOf('w-280 [--sheet-float-top:7.375rem]')],
  play: async ({ canvasElement }) => {
    const cards = within(canvasElement).getByTestId('explore-cards');
    const map = cards.parentElement?.getBoundingClientRect();
    const box = cards.getBoundingClientRect();
    await expect({ top: box.top - (map?.top ?? 0), width: box.width }).toEqual({
      top: 0,
      width: 384,
    });
  },
};
