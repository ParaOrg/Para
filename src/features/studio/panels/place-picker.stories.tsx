import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { PlacePicker } from './place-picker';
import type { Place } from './places';

/** A place as the picker lists it: sample data, no boxes needed to show its name. */
const place = (label: string): Place => ({
  key: label.toLowerCase(),
  label,
  boxes: [],
  terminal: null,
});

const places = [place('SM Fairview'), place('Tala'), place('Lagro')];

const meta = {
  title: 'Features/Studio/PlacePicker',
  component: PlacePicker,
  // Half the save panel's card, where the two ends sit side by side. The
  // `phone` parameter puts it at a handset's width, as the panel stacks them.
  decorators: [
    (Story, ctx) => (
      <div className={ctx.parameters.phone ? 'w-[390px] bg-surface p-6' : 'w-56 bg-surface p-6'}>
        <Story />
      </div>
    ),
  ],
  parameters: { layout: 'padded' },
  args: {
    label: 'Head',
    hint: '(where the jeeps wait)',
    places,
    value: '',
    disabled: false,
    onChange: fn(),
    testId: 'save-head',
  },
} satisfies Meta<typeof PlacePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing guessed: "Pick a place…", and picking one hands back its key. */
export const Empty: Story = {
  play: async ({ args, canvasElement }) => {
    const select = within(canvasElement).getByTestId('save-head');
    await expect(select).toHaveValue('');
    await expect(select).toBeRequired();
    await userEvent.selectOptions(select, 'Tala');
    await expect(args.onChange).toHaveBeenCalledWith('tala');
  },
};

/** The far end, with a place picked. */
export const Picked: Story = {
  args: { label: 'Tail', hint: '(the far end)', value: 'tala', testId: 'save-tail' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('save-tail')).toHaveDisplayValue('Tala');
  },
};

/** A return trip's ends: the route's, shown and locked. */
export const Disabled: Story = {
  args: { value: 'sm fairview', disabled: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByTestId('save-head')).toBeDisabled();
  },
};

/** A city's worth of places, some with long names. */
export const ManyPlaces: Story = {
  args: {
    value: 'sm city fairview public transport terminal',
    places: [
      place('SM City Fairview Public Transport Terminal'),
      place('Novaliches Bayan'),
      place('Bagong Silang Kanan 5'),
      place('Deparo'),
      place('Lagro'),
      place('Quezon City Hall'),
      place('Tala'),
      place('Zabarte'),
    ],
  },
};

/** At phone width, where the two ends stack. */
export const Phone: Story = {
  args: ManyPlaces.args,
  parameters: { phone: true },
};
