import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { expect, fn, userEvent } from "storybook/test";
import { Textarea } from "./Textarea.tsx";

const meta: Meta<typeof Textarea> = {
	title: "Components/Textarea",
	component: Textarea,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Flerlinjes tekstfelt med label, hjelpetekst og feiltilstand. Feltet er interaktivt: i apps/web må øya monteres med client:load, eller client:visible hvis skjemaet ligger under folden.",
			},
		},
	},
	tags: ["autodocs"],
	args: {
		label: "Begrunnelse",
		placeholder: "Skriv noen setninger om hvorfor du søker.",
		onChange: fn(),
	},
	argTypes: {
		id: { table: { disable: true } },
	},
	decorators: [
		(Story) => (
			<div className="w-96">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const field = canvas.getByLabelText("Begrunnelse");
		// Vaktpost: uten Tailwind i testoppsettet blir alt ustilt og
		// kontrastsjekkene består trivielt.
		await expect(getComputedStyle(field).borderRadius).toBe("8px");
	},
};

export const WithSupportingText: Story = {
	args: { supportingText: "Maks 500 tegn." },
	play: async ({ canvas }) => {
		await expect(canvas.getByLabelText("Begrunnelse")).toHaveAccessibleDescription(
			"Maks 500 tegn.",
		);
	},
};

export const Rows: Story = {
	args: { rows: 8 },
};

export const ErrorState: Story = {
	name: "Error",
	args: {
		error: "Begrunnelsen må ha minst 20 tegn.",
		supportingText: "Maks 500 tegn.",
		defaultValue: "For kort",
	},
	play: async ({ canvas }) => {
		const field = canvas.getByLabelText("Begrunnelse");
		await expect(field).toHaveAttribute("aria-invalid", "true");
		await expect(field).toHaveAccessibleDescription(
			"Maks 500 tegn. Begrunnelsen må ha minst 20 tegn.",
		);
		await expect(canvas.getByRole("alert")).toHaveTextContent("Begrunnelsen må ha minst 20 tegn.");
	},
};

export const Disabled: Story = {
	args: { disabled: true, defaultValue: "Sendt inn 3. mars." },
	play: async ({ canvas }) => {
		await expect(canvas.getByLabelText("Begrunnelse")).toBeDisabled();
	},
};

export const Typing: Story = {
	play: async ({ args, canvas }) => {
		const field = canvas.getByLabelText<HTMLTextAreaElement>("Begrunnelse");
		await userEvent.type(field, "Jeg søker fordi");
		await expect(field.value).toBe("Jeg søker fordi");
		await expect(args.onChange).toHaveBeenLastCalledWith("Jeg søker fordi");
	},
};

export const FocusRing: Story = {
	play: async ({ canvas }) => {
		const field = canvas.getByLabelText("Begrunnelse");
		await userEvent.tab();
		await expect(field).toHaveFocus();
		await expect(getComputedStyle(field).outlineWidth).toBe("2px");
	},
};

function ControlledField(args: ComponentProps<typeof Textarea>) {
	const [value, setValue] = useState("");
	return (
		<div className="flex flex-col gap-2">
			<Textarea
				{...args}
				onChange={(newValue) => {
					setValue(newValue);
					args.onChange?.(newValue);
				}}
				value={value}
			/>
			<p className="text-small text-text-weak">Antall tegn: {value.length}</p>
		</div>
	);
}

export const Controlled: Story = {
	render: (args) => <ControlledField {...args} />,
	play: async ({ canvas }) => {
		await userEvent.type(canvas.getByLabelText("Begrunnelse"), "Hei");
		await expect(canvas.getByText("Antall tegn: 3")).toBeInTheDocument();
	},
};
