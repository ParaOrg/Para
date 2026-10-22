import type { Meta, StoryObj } from '@storybook/react-vite';

import { CARD_SURFACE, CARD_TEXT } from './livery-card';
import { RailwayBadge } from './railway-badge';
import { RAILWAY_LIVERY } from '../model/liveries';

const meta = {
  title: 'Features/Routes/RailwayBadge',
  component: RailwayBadge,
  args: { kind: 'start', railway: 'LRT-1', code: 'GL02' },
  decorators: [
    (Story, { args }) => {
      const livery = RAILWAY_LIVERY[args.railway];
      return (
        <div className={'flex p-4 ' + CARD_SURFACE[livery] + ' ' + CARD_TEXT[livery]}>
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof RailwayBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The origin's badge on LRT 1: the S disc and the station's code. */
export const Start: Story = {};

/** A row's destination on LRT 1: the E disc and the code. */
export const End: Story = { args: { kind: 'end', code: 'GL26' } };

/** LRT 2's pair, in its own surface. */
export const LightRailWayTwo: Story = { args: { railway: 'LRT-2', code: 'PL01' } };

/** MRT 3: dark chips with yellow words, the discs in brighter shades. */
export const MetroRailWayThree: Story = { args: { railway: 'MRT-3', code: 'YL01' } };

/** MRT 3's End. */
export const MetroRailWayThreeEnd: Story = {
  args: { railway: 'MRT-3', kind: 'end', code: 'YL13' },
};

/** The ferry has no codes, so the card never draws this; it takes the ferry's surface if one is given. */
export const Ferry: Story = { args: { railway: 'Ferry', code: 'FR01' } };
