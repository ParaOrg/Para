import type { Meta, StoryObj } from '@storybook/react-vite';

import { cn } from '@/shared/utils/cn';

import { CARD_SURFACE, CARD_TEXT } from './livery-card';
import { RailwayBadge } from './railway-badge';
import { RAILWAY_LIVERY } from '../model/liveries';

const meta = {
  title: 'Features/Routes/RailwayBadge',
  component: RailwayBadge,
  args: { railway: 'LRT-1', code: 'GL02' },
  decorators: [
    (Story, { args }) => {
      const livery = RAILWAY_LIVERY[args.railway];
      return (
        <div className={cn('flex p-4 font-sn-pro', CARD_SURFACE[livery], CARD_TEXT[livery])}>
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof RailwayBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** LRT 1: the station's code in the line's green on white. */
export const LightRailWayOne: Story = {};

/** LRT 2, in its own surface. */
export const LightRailWayTwo: Story = { args: { railway: 'LRT-2', code: 'PL01' } };

/** MRT 3: a dark chip with yellow words. */
export const MetroRailWayThree: Story = { args: { railway: 'MRT-3', code: 'YL01' } };
