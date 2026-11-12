import type { Meta, StoryObj } from '@storybook/react-vite';

import { MapFailure } from './map-failure';

const meta = {
  title: 'Features/Routes/MapFailure',
  component: MapFailure,
  // Over a phone-sized map, where MapView draws it.
  decorators: [
    (Story) => (
      <div className="relative h-180 w-97.5 overflow-clip bg-surface-secondary">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'centered' },
  args: {
    message: 'Failed to fetch',
    diagnosis: null,
    dom: null,
    trace: [],
    styleUrl: 'https://tiles.openfreemap.org/styles/positron',
  },
} satisfies Meta<typeof MapFailure>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Just failed: the message and the style's address, before the device has answered. */
export const JustFailed: Story = {};

/** The device has answered: WebGL, the renderer, the style's fetch, the container and the events. */
export const WithItsDiagnosis: Story = {
  args: {
    message: 'The map did not finish loading in 12 seconds.',
    diagnosis: {
      webgl: 'webgl2',
      renderer: 'ANGLE (Qualcomm, Adreno (TM) 610, OpenGL ES 3.2)',
      styleFetch: 'HTTP 200, 58211 bytes in 412ms',
    },
    dom: 'canvas 786×1704 (css 393×852)',
    trace: ['styledata@212ms', 'sourcedata@240ms', 'render@301ms'],
  },
};

/** Nothing fired, a renderer the browser hides, and words that must wrap, not spill. */
export const LongAndEmpty: Story = {
  args: {
    message:
      'AJAXError: Failed to fetch (0): https://tiles.openfreemap.org/styles/positron-with-a-very-long-name-that-has-nowhere-to-break',
    diagnosis: {
      webgl: 'none',
      renderer: null,
      styleFetch: 'fetch threw after 30012ms: Failed to fetch',
    },
    styleUrl:
      'https://tiles.openfreemap.org/styles/positron-with-a-very-long-name-that-has-nowhere-to-break',
  },
};
