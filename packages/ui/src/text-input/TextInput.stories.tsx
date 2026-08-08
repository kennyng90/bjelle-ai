import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { expect, fn, userEvent } from "storybook/test";
import { TextInput } from "./TextInput.tsx";

const meta: Meta<typeof TextInput> = {
	title: "Components/TextInput",
	component: TextInput,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Enlinjes tekstfelt med label, hjelpetekst, ikoner og feiltilstand. Feltet er interaktivt: i apps/web må øya monteres med client:load, eller client:visible hvis skjemaet ligger under folden.",
			},
		},
	},
	tags: ["autodocs"],
	args: {
		label: "E-postadresse",
		placeholder: "navn@selskap.no",
		onChange: fn(),
	},
	argTypes: {
		size: { control: "inline-radio", options: ["sm", "md"] },
		// Arvet fra InputHTMLAttributes. Ikke noe designeren skal skru på.
		type: { table: { disable: true } },
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
		const field = canvas.getByLabelText("E-postadresse");
		// Vaktpost: fanger at Tailwind har falt ut av testoppsettet. Uten stiler
		// består enhver kontrastsjekk trivielt.
		await expect(getComputedStyle(field).borderRadius).toBe("8px");
	},
};

export const WithSupportingText: Story = {
	args: { supportingText: "Vi bruker adressen kun til varsler om søknaden." },
	play: async ({ canvas }) => {
		const field = canvas.getByLabelText("E-postadresse");
		await expect(field).toHaveAccessibleDescription(
			"Vi bruker adressen kun til varsler om søknaden.",
		);
	},
};

export const WithIcons: Story = {
	render: (args) => (
		<div className="flex flex-col gap-4">
			<TextInput {...args} label="E-postadresse" leadingIcon="Mail" />
			<TextInput {...args} label="Nettadresse" leadingIcon="Link" trailingIcon="ExternalLink" />
		</div>
	),
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex flex-col gap-4">
			<TextInput {...args} label="Liten" size="sm" />
			<TextInput {...args} label="Middels" size="md" />
		</div>
	),
};

export const ErrorState: Story = {
	name: "Error",
	args: {
		error: "Skriv inn en gyldig e-postadresse.",
		supportingText: "Vi bruker adressen kun til varsler om søknaden.",
		defaultValue: "kari@",
	},
	play: async ({ canvas }) => {
		const field = canvas.getByLabelText("E-postadresse");
		await expect(field).toHaveAttribute("aria-invalid", "true");
		// Feilen skal nå skjermleseren, ikke bare males rød.
		await expect(field).toHaveAccessibleDescription(
			"Vi bruker adressen kun til varsler om søknaden. Skriv inn en gyldig e-postadresse.",
		);
		await expect(canvas.getByRole("alert")).toHaveTextContent("Skriv inn en gyldig e-postadresse.");
		// Kanten skal skifte farge sammen med meldingen.
		const errorColor = getComputedStyle(document.documentElement)
			.getPropertyValue("--stroke-error-strong")
			.trim();
		await expect(getComputedStyle(field).borderTopColor).toBe(errorColor);
	},
};

export const Disabled: Story = {
	args: { disabled: true, defaultValue: "kari@bjelle.no" },
	play: async ({ canvas }) => {
		await expect(canvas.getByLabelText("E-postadresse")).toBeDisabled();
	},
};

export const Typing: Story = {
	play: async ({ args, canvas }) => {
		const field = canvas.getByLabelText<HTMLInputElement>("E-postadresse");
		await userEvent.type(field, "kari@bjelle.no");
		await expect(field.value).toBe("kari@bjelle.no");
		await expect(args.onChange).toHaveBeenLastCalledWith("kari@bjelle.no");
	},
};

export const FocusRing: Story = {
	play: async ({ canvas }) => {
		const field = canvas.getByLabelText("E-postadresse");
		await userEvent.tab();
		await expect(field).toHaveFocus();
		// Ringen ligger utenpå kanten, så den ikke flytter layout når feltet får fokus.
		await expect(getComputedStyle(field).outlineWidth).toBe("2px");
	},
};

function ControlledField(args: ComponentProps<typeof TextInput>) {
	const [value, setValue] = useState("");
	return (
		<div className="flex flex-col gap-2">
			<TextInput
				{...args}
				onChange={(newValue) => {
					setValue(newValue);
					args.onChange?.(newValue);
				}}
				value={value}
			/>
			<p className="text-small text-text-weak">Verdi: {value || "tom"}</p>
		</div>
	);
}

export const Controlled: Story = {
	render: (args) => <ControlledField {...args} />,
	play: async ({ canvas }) => {
		await userEvent.type(canvas.getByLabelText("E-postadresse"), "ola");
		await expect(canvas.getByText("Verdi: ola")).toBeInTheDocument();
	},
};
