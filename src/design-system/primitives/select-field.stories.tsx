import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { SelectField } from './select-field';

const OPTIONS = (
  <>
    <option value="">Not said</option>
    <option value="jeep">Jeep</option>
    <option value="bus">Bus</option>
    <option value="uv">UV Express</option>
  </>
);

/** The InputField (Figma 4295:20567) as a dropdown, the phone's own picker under the chevron. */
const meta = {
  title: 'DesignSystem/Primitives/SelectField',
  component: SelectField,
  args: { label: 'What did you ride?', defaultValue: 'jeep', onChange: fn(), children: OPTIONS },
  decorators: [
    (Story) => (
      <div className="w-86 bg-surface p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SelectField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Property 1=Default, with chevron-down. */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    const select = within(canvasElement).getByLabelText('What did you ride?');
    await userEvent.selectOptions(select, 'bus');
    await expect(args.onChange).toHaveBeenCalled();
  },
};

/** Property 1=Active: focused. */
export const Active: Story = {
  play: async ({ canvasElement }) => {
    within(canvasElement).getByLabelText('What did you ride?').focus();
  },
};

/** Nothing picked yet. */
export const NothingPicked: Story = { args: { defaultValue: '' } };

/** Property 1=Variant3. */
export const WithError: Story = { args: { error: 'Pick what you rode.' } };

/** Property 1=Disabled. */
export const Disabled: Story = { args: { disabled: true } };

/** A long option is cut short before the chevron. */
export const LongContent: Story = {
  args: {
    defaultValue: 'long',
    children: (
      <option value="long">
        SM City Fairview Jeepney Terminal, Quirino Highway corner Regalado
      </option>
    ),
  },
};
