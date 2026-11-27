import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { Direction } from '@/features/routes/model/routes';

import { PlaygroundListControls } from './playground-list-controls';

/** Sample data only, shaped like the studio's tables. Not the real map. */
function direction(
  key: string,
  way: string,
  options: { reversed?: boolean; isLoop?: boolean; mode?: Direction['route']['mode'] } = {},
): Direction {
  const { reversed = false, isLoop = false, mode = 'jeepney' } = options;
  return {
    id: key + (reversed ? '-back' : '-out'),
    routeId: key + '-route',
    name: way,
    originTerminal: null,
    destinationTerminal: null,
    shape: {
      type: 'LineString',
      coordinates: [
        [121.04, 14.7],
        [121.04, 14.78],
      ],
    },
    reversed,
    confidence: 'drawn',
    route: {
      id: key + '-route',
      signboard: isLoop ? way : null,
      longName: null,
      mode,
      fareNote: null,
      headHotspotId: isLoop ? null : key + '-head',
      tailHotspotId: isLoop ? null : key + '-tail',
      via: null,
      name: way,
      ...(isLoop && { isLoop: true }),
    },
  };
}

const talaRoutes: Direction[] = [
  direction('a', 'Tala → SM Fairview'),
  direction('a', 'SM Fairview → Tala', { reversed: true }),
  direction('b', 'Tala → Novaliches', { mode: 'bus' }),
  direction('b', 'Novaliches → Tala', { reversed: true, mode: 'bus' }),
];

/** Keeps the way round and the picks, so a story can be tapped through. */
function Controls(props: ComponentProps<typeof PlaygroundListControls>) {
  const [back, setBack] = useState(props.list.back);
  const [modePicks, setModePicks] = useState(props.list.modePicks);
  return (
    <PlaygroundListControls
      {...props}
      list={{ ...props.list, back, modePicks }}
      onFlip={() => {
        props.onFlip();
        setBack((b) => !b);
      }}
      onFilter={(next) => {
        props.onFilter(next);
        setModePicks(next);
      }}
    />
  );
}

/**
 * The studio's route list's controls on the map on a computer (Figma 4905:21658): Vice Versa over
 * the Overview, the filter right of them, 16 from the map's top and the docked list's edge. Phones
 * keep the list's Controller (Features/Routes/RouteCardList), so there is no phone story here.
 */
const meta = {
  title: 'App/Studio/PlaygroundListControls',
  component: PlaygroundListControls,
  render: (args) => <Controls {...args} />,
  decorators: [
    (Story) => (
      <div className="relative h-120 w-300 bg-surface-quaternary">
        {/* The docked list's place: 384 wide on the map's left, ending at its last card. */}
        <div className="absolute top-0 left-0 h-60 w-96 bg-surface shadow-bottom-sheet-top-shadow" />
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    map: null,
    list: { candidates: talaRoutes, back: false, listing: 'every-line', modePicks: [] },
    overview: { isShown: true, go: fn() },
    onFlip: fn(),
    onFilter: fn(),
  },
} satisfies Meta<typeof PlaygroundListControls>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The camera off the list's routes: Vice Versa, the filter, and the Overview under them. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Vice Versa' }));
    await expect(args.onFlip).toHaveBeenCalledOnce();
    await expect(canvas.getByTestId('chooser-flip')).toHaveAttribute('data-back', 'true');
  },
};

/** At the overview: no Overview button. */
export const AtTheOverview: Story = { args: { overview: { isShown: false, go: fn() } } };

/** Two kinds of ride picked: the filter counts them and says which. */
export const Filtered: Story = {
  args: {
    list: {
      candidates: talaRoutes,
      back: false,
      listing: 'every-line',
      modePicks: ['jeep', 'bus'],
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('chooser-filter')).toHaveAttribute(
      'aria-label',
      'Filter: Jeepney, Bus',
    );
  },
};

/** Nothing drawn the other way round: Vice Versa rests disabled. */
export const NothingTheOtherWay: Story = {
  args: {
    list: {
      candidates: [direction('c', 'Lagro → Fatima')],
      back: false,
      listing: 'every-line',
      modePicks: [],
    },
  },
};

/** Only a loop listed: no way back, so no Vice Versa. */
export const OnlyALoop: Story = {
  args: {
    list: {
      candidates: [direction('ikot', 'UP – Ikot', { isLoop: true })],
      back: false,
      listing: 'every-line',
      modePicks: [],
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button', { name: 'Vice Versa' })).toBeNull();
  },
};
