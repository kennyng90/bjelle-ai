import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { expect, fn, userEvent } from "storybook/test";
import { Select } from "./Select.tsx";

const roles = [
	{ value: "admin", label: "Administrator" },
	{ value: "redaktor", label: "Redaktør" },
	{ value: "leser", label: "Leser" },
];

const meta: Meta<typeof Select> = {
	title: "Components/Select",
	component: Select,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Nedtrekksliste bygget på et ekte <select>. Det native elementet beholdes med vilje: det gir riktig tastaturoppførsel og systemets egen liste på mobil. Kontrollen er interaktiv, så i apps/web må øya monteres med client:load (client:visible under folden).",
			},
		},
	},
	tags: ["autodocs"],
	args: {
		label: "Rolle",
		placeholder: "Velg rolle",
		options: roles,
		onChange: fn(),
	},
	argTypes: {
		size: { control: "inline-radio", options: ["sm", "md"] },
		id: { table: { disable: true } },
	},
	decorators: [
		(Story) => (
			<div className="w-80">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const field = canvas.getByLabelText("Rolle");
		await expect(getComputedStyle(field).borderRadius).toBe("8px");
		await expect(canvas.getByRole("option", { name: "Velg rolle" })).toBeDisabled();
	},
};

export const TextAlternatives: Story = {
	args: { options: ["Dag", "Uke", "Måned"], label: "Periode", placeholder: undefined },
};

export const WithSupportingText: Story = {
	args: { supportingText: "Rollen styrer hva brukeren får se." },
	play: async ({ canvas }) => {
		await expect(canvas.getByLabelText("Rolle")).toHaveAccessibleDescription(
			"Rollen styrer hva brukeren får se.",
		);
	},
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex flex-col gap-4">
			<Select {...args} label="Liten" size="sm" />
			<Select {...args} label="Middels" size="md" />
		</div>
	),
};

export const PlaceholderColor: Story = {
	name: "Placeholder is muted",
	render: (args) => (
		<div className="flex flex-col gap-4">
			<Select {...args} label="Uten valg" />
			<Select {...args} defaultValue="admin" label="Med valg" />
		</div>
	),
	play: async ({ canvas }) => {
		const empty = canvas.getByLabelText("Uten valg");
		const selected = canvas.getByLabelText("Med valg");
		// Plassholderen skal ikke se ut som en ekte verdi.
		await expect(getComputedStyle(empty).color).not.toBe(getComputedStyle(selected).color);
	},
};

export const ErrorState: Story = {
	name: "Error",
	args: {
		error: "Velg en rolle før du fortsetter.",
		supportingText: "Rollen styrer hva brukeren får se.",
	},
	play: async ({ canvas }) => {
		const field = canvas.getByLabelText("Rolle");
		await expect(field).toHaveAttribute("aria-invalid", "true");
		await expect(field).toHaveAccessibleDescription(
			"Rollen styrer hva brukeren får se. Velg en rolle før du fortsetter.",
		);
		await expect(canvas.getByRole("alert")).toHaveTextContent("Velg en rolle før du fortsetter.");
	},
};

export const Disabled: Story = {
	args: { disabled: true, defaultValue: "leser" },
	play: async ({ canvas }) => {
		await expect(canvas.getByLabelText("Rolle")).toBeDisabled();
	},
};

export const Selecting: Story = {
	play: async ({ args, canvas }) => {
		const field = canvas.getByLabelText<HTMLSelectElement>("Rolle");
		await userEvent.selectOptions(field, "redaktor");
		await expect(field.value).toBe("redaktor");
		await expect(args.onChange).toHaveBeenLastCalledWith("redaktor");
	},
};

export const FocusRing: Story = {
	play: async ({ canvas }) => {
		const field = canvas.getByLabelText("Rolle");
		await userEvent.tab();
		await expect(field).toHaveFocus();
		await expect(getComputedStyle(field).outlineWidth).toBe("2px");
	},
};

function ControlledField(args: ComponentProps<typeof Select>) {
	const [value, setValue] = useState("");
	return (
		<div className="flex flex-col gap-2">
			<Select
				{...args}
				onChange={(newValue) => {
					setValue(newValue);
					args.onChange?.(newValue);
				}}
				value={value}
			/>
			<p className="text-small text-text-weak">Valgt: {value || "ingen"}</p>
		</div>
	);
}

export const Controlled: Story = {
	render: (args) => <ControlledField {...args} />,
	play: async ({ canvas }) => {
		await userEvent.selectOptions(canvas.getByLabelText("Rolle"), "leser");
		await expect(canvas.getByText("Valgt: leser")).toBeInTheDocument();
	},
};
