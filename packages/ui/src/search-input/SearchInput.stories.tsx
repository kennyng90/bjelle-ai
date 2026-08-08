import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { expect, fn, userEvent } from "storybook/test";
import { SearchInput } from "./SearchInput.tsx";

const meta: Meta<typeof SearchInput> = {
	title: "Components/SearchInput",
	component: SearchInput,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Søkefelt med søkeikon og tøm-knapp. Uten label får feltet navnet «Søk», så det aldri står navnløst for en skjermleser. Feltet er interaktivt: i apps/web må øya monteres med client:load, eller client:visible hvis søket ligger under folden.",
			},
		},
	},
	tags: ["autodocs"],
	args: {
		placeholder: "Søk etter søkere",
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
		const field = canvas.getByRole("searchbox", { name: "Søk" });
		await expect(getComputedStyle(field).borderRadius).toBe("8px");
		// Tom-knappen skal ikke stå der og støye når det ikke er noe å tømme.
		await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
	},
};

export const WithLabel: Story = {
	args: { label: "Søk i søkerlista" },
	play: async ({ canvas }) => {
		await expect(canvas.getByLabelText("Søk i søkerlista")).toBeInTheDocument();
	},
};

export const WithValue: Story = {
	args: { defaultValue: "Kari" },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("button", { name: "Tøm søk" })).toBeInTheDocument();

		// De to ikonene står i samme felt og skal lese like tunge. Krysset sto
		// fast på 16 mens søkeikonet fulgte størrelsen, så i md var det synlig
		// mindre enn ikonet på motsatt side.
		const field = canvas.getByRole<HTMLInputElement>("searchbox");
		const frame = field.parentElement as HTMLElement;
		const [search, cross] = Array.from(frame.querySelectorAll("svg"));
		const searchBox = search.getBoundingClientRect();
		const crossBox = cross.getBoundingClientRect();
		await expect(crossBox.width).toBe(searchBox.width);

		// ... og de skal ha samme optiske marg til hver sin kant. Tøm-knappen er
		// større enn glyfen, så innrykket må trekke fra polstringen.
		const fieldBox = field.getBoundingClientRect();
		await expect(fieldBox.right - crossBox.right).toBe(searchBox.left - fieldBox.left);
	},
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex flex-col gap-4">
			<SearchInput {...args} label="Liten" size="sm" />
			<SearchInput {...args} label="Middels" size="md" />
		</div>
	),
};

export const Disabled: Story = {
	args: { disabled: true, defaultValue: "Kari" },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("searchbox")).toBeDisabled();
		await expect(canvas.getByRole("button", { name: "Tøm søk" })).toBeDisabled();
	},
};

export const Searching: Story = {
	play: async ({ args, canvas }) => {
		const field = canvas.getByRole<HTMLInputElement>("searchbox");
		await userEvent.type(field, "Kari");
		await expect(field.value).toBe("Kari");
		await expect(args.onChange).toHaveBeenLastCalledWith("Kari");
	},
};

export const Clearing: Story = {
	args: { defaultValue: "Kari", onClear: fn() },
	play: async ({ args, canvas }) => {
		const field = canvas.getByRole<HTMLInputElement>("searchbox");
		await userEvent.click(canvas.getByRole("button", { name: "Tøm søk" }));
		await expect(field.value).toBe("");
		await expect(args.onChange).toHaveBeenLastCalledWith("");
		await expect(args.onClear).toHaveBeenCalled();
		// Knappen forsvinner når feltet er tomt. Uten dette havner fokus på <body>.
		await expect(field).toHaveFocus();
	},
};

export const FocusRing: Story = {
	args: { defaultValue: "Kari" },
	play: async ({ canvas }) => {
		const field = canvas.getByRole("searchbox");
		await userEvent.tab();
		await expect(field).toHaveFocus();
		await expect(getComputedStyle(field).outlineWidth).toBe("2px");
		// Tøm-knappen må nås med tastatur og ha sin egen ring.
		await userEvent.tab();
		const button = canvas.getByRole("button", { name: "Tøm søk" });
		await expect(button).toHaveFocus();
		await expect(getComputedStyle(button).outlineWidth).toBe("2px");
	},
};

function ControlledField(args: ComponentProps<typeof SearchInput>) {
	const [value, setValue] = useState("Kari");
	return (
		<div className="flex flex-col gap-2">
			<SearchInput
				{...args}
				onChange={(newValue) => {
					setValue(newValue);
					args.onChange?.(newValue);
				}}
				value={value}
			/>
			<p className="text-small text-text-weak">Søk: {value || "tomt"}</p>
		</div>
	);
}

export const Controlled: Story = {
	render: (args) => <ControlledField {...args} />,
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Tøm søk" }));
		await expect(canvas.getByText("Søk: tomt")).toBeInTheDocument();
	},
};
