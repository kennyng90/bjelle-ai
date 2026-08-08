import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button.tsx";

const meta: Meta<typeof Button> = {
	title: "Primitiver/Button",
	component: Button,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { children: "Følg selskapet" },
	argTypes: {
		variant: { control: "inline-radio", options: ["primary", "secondary", "ghost"] },
		size: { control: "inline-radio", options: ["sm", "md", "lg"] },
		// Arvet fra ButtonHTMLAttributes. Ikke noe designeren skal skru på.
		type: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
	args: { variant: "secondary" },
};

export const Ghost: Story = {
	args: { variant: "ghost" },
};

export const Storrelser: Story = {
	name: "Størrelser",
	render: (args) => (
		<div className="flex items-center gap-3">
			<Button {...args} size="sm" />
			<Button {...args} size="md" />
			<Button {...args} size="lg" />
		</div>
	),
};

export const Deaktivert: Story = {
	args: { disabled: true },
};
