import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { expect, fn, userEvent } from "storybook/test";
import { Checkbox } from "./Checkbox.tsx";

const meta: Meta<typeof Checkbox> = {
	title: "Components/Checkbox",
	component: Checkbox,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Avkryssingsboks med label, hjelpetekst og ubestemt tilstand. Kontrollen er interaktiv: i apps/web må øya monteres med client:load, eller client:visible hvis skjemaet ligger under folden. Uten direktiv rendres den som statisk HTML og onChange fyrer aldri.",
			},
		},
	},
	tags: ["autodocs"],
	args: {
		label: "Send meg oppdateringer",
		onChange: fn(),
	},
	argTypes: {
		size: { control: "inline-radio", options: ["sm", "md"] },
		id: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const box = canvas.getByRole<HTMLInputElement>("checkbox", {
			name: "Send meg oppdateringer",
		});
		await expect(box).not.toBeChecked();
		const visualBox = box.nextElementSibling as HTMLElement;
		// Vaktpost: uten Tailwind er ruta ustilt og kontrastsjekkene består trivielt.
		await expect(getComputedStyle(visualBox).borderRadius).toBe("4px");
		// WCAG 2.5.8: treffflaten skal være minst 24x24 selv om ruta tegnes mindre.
		const surface = box.getBoundingClientRect();
		await expect(surface.width).toBeGreaterThanOrEqual(24);
		await expect(surface.height).toBeGreaterThanOrEqual(24);
	},
};

export const Checked: Story = {
	render: (args) => (
		<div className="flex flex-col gap-4">
			<Checkbox {...args} label="Ikke avkrysset" />
			<Checkbox {...args} defaultChecked label="Avkrysset" />
		</div>
	),
	play: async ({ canvas }) => {
		const off = canvas.getByRole("checkbox", { name: "Ikke avkrysset" });
		const on = canvas.getByRole("checkbox", { name: "Avkrysset" });
		await expect(on).toBeChecked();
		const visualBoxOff = off.nextElementSibling as HTMLElement;
		const visualBoxOn = on.nextElementSibling as HTMLElement;
		// Ruta fylles av CSS, ikke av React-state: den må også stemme når feltet
		// er ukontrollert.
		await expect(getComputedStyle(visualBoxOn).backgroundColor).not.toBe(
			getComputedStyle(visualBoxOff).backgroundColor,
		);
		const check = visualBoxOn.querySelector("svg") as SVGElement;
		await expect(getComputedStyle(check).display).toBe("block");
	},
};

export const WithSupportingText: Story = {
	args: { supportingText: "Maks én e-post i uka, og du kan melde deg av når som helst." },
	play: async ({ canvas }) => {
		const box = canvas.getByRole("checkbox");
		// Hjelpeteksten skal beskrive, ikke bake seg inn i navnet.
		await expect(box).toHaveAccessibleName("Send meg oppdateringer");
		await expect(box).toHaveAccessibleDescription(
			"Maks én e-post i uka, og du kan melde deg av når som helst.",
		);
	},
};

export const Indeterminate: Story = {
	args: { indeterminate: true, label: "Velg alle søkere" },
	play: async ({ canvas }) => {
		const box = canvas.getByRole<HTMLInputElement>("checkbox");
		// indeterminate finnes kun som DOM-property, aldri som attributt.
		await expect(box.indeterminate).toBe(true);
		await expect(box).toHaveAttribute("aria-checked", "mixed");
		// Ubestemt skal også synes: en strek, ikke bare en annen farge.
		const visualBox = box.nextElementSibling as HTMLElement;
		await expect(visualBox.querySelector("svg")).toBeInTheDocument();
	},
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex flex-col gap-4">
			<Checkbox {...args} label="Liten" size="sm" />
			<Checkbox {...args} label="Middels" size="md" />
		</div>
	),
};

export const Disabled: Story = {
	render: (args) => (
		<div className="flex flex-col gap-4">
			<Checkbox {...args} disabled label="Deaktivert og av" />
			<Checkbox {...args} defaultChecked disabled label="Deaktivert og på" />
		</div>
	),
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("checkbox", { name: "Deaktivert og av" })).toBeDisabled();
	},
};

export const ErrorState: Story = {
	name: "Error",
	args: {
		label: "Jeg godtar vilkårene",
		error: "Du må godta vilkårene for å sende inn.",
	},
	play: async ({ canvas }) => {
		const box = canvas.getByRole("checkbox");
		await expect(box).toHaveAttribute("aria-invalid", "true");
		// Feilen skal stå som tekst, ikke bare som rød kant.
		await expect(box).toHaveAccessibleDescription("Du må godta vilkårene for å sende inn.");
		await expect(canvas.getByRole("alert")).toBeInTheDocument();
		// Feilen skal også synes på selve ruta, ikke bare i teksten under.
		const visualBox = box.nextElementSibling as HTMLElement;
		const errorColor = getComputedStyle(document.documentElement)
			.getPropertyValue("--stroke-error-strong")
			.trim();
		await expect(getComputedStyle(visualBox).borderTopColor).toBe(errorColor);
	},
};

export const Group: Story = {
	render: (args) => (
		<fieldset className="flex flex-col gap-3 border-0 p-0">
			<legend className="mb-2 text-small font-strong text-text-strong">Varsle meg om</legend>
			<Checkbox {...args} defaultChecked label="Nye søkere" />
			<Checkbox {...args} label="Kommentarer" />
			<Checkbox {...args} label="Ukesammendrag" />
		</fieldset>
	),
};

export const Toggling: Story = {
	play: async ({ args, canvas }) => {
		const box = canvas.getByRole("checkbox");
		await userEvent.click(box);
		await expect(box).toBeChecked();
		await expect(args.onChange).toHaveBeenLastCalledWith(true);
		await userEvent.click(box);
		await expect(box).not.toBeChecked();
		await expect(args.onChange).toHaveBeenLastCalledWith(false);
	},
};

export const Keyboard: Story = {
	play: async ({ args, canvas }) => {
		const box = canvas.getByRole("checkbox");
		await userEvent.tab();
		await expect(box).toHaveFocus();
		const visualBox = box.nextElementSibling as HTMLElement;
		// Ringen tegnes på ruta, ikke på den gjennomsiktige inputen.
		await expect(getComputedStyle(visualBox).outlineWidth).toBe("2px");
		await userEvent.keyboard(" ");
		await expect(box).toBeChecked();
		await expect(args.onChange).toHaveBeenLastCalledWith(true);
	},
};

function ControlledBox(args: ComponentProps<typeof Checkbox>) {
	const [on, setOn] = useState(false);
	return (
		<div className="flex flex-col gap-2">
			<Checkbox
				{...args}
				checked={on}
				onChange={(newValue) => {
					setOn(newValue);
					args.onChange?.(newValue);
				}}
			/>
			<p className="text-small text-text-weak">Tilstand: {on ? "på" : "av"}</p>
		</div>
	);
}

export const Controlled: Story = {
	render: (args) => <ControlledBox {...args} />,
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("checkbox"));
		await expect(canvas.getByText("Tilstand: på")).toBeInTheDocument();
	},
};
