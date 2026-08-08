import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { expect, fn, userEvent } from "storybook/test";
import { Switch } from "./Switch.tsx";

const meta: Meta<typeof Switch> = {
	title: "Components/Switch",
	component: Switch,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Av/på-bryter for en innstilling som slår inn med en gang. Skal valget først gjelde når skjemaet sendes inn, bruk Checkbox i stedet. Kontrollen er interaktiv: i apps/web må øya monteres med client:load, eller client:visible hvis innstillingen ligger under folden.",
			},
		},
	},
	tags: ["autodocs"],
	args: {
		label: "Mørkt tema",
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
		const toggle = canvas.getByRole<HTMLInputElement>("switch", { name: "Mørkt tema" });
		await expect(toggle).not.toBeChecked();
		const track = toggle.nextElementSibling as HTMLElement;
		// Vaktpost: uten Tailwind er sporet ustilt og kontrastsjekkene består trivielt.
		await expect(getComputedStyle(track).borderRadius).toBe("9999px");
		// WCAG 2.5.8: treffflaten skal være minst 24x24.
		const surface = toggle.getBoundingClientRect();
		await expect(surface.width).toBeGreaterThanOrEqual(24);
		await expect(surface.height).toBeGreaterThanOrEqual(24);
	},
};

const knobPosition = (toggle: HTMLElement) => {
	const track = toggle.nextElementSibling as HTMLElement;
	const knob = track.nextElementSibling as HTMLElement;
	return knob.getBoundingClientRect().left - track.getBoundingClientRect().left;
};

export const On: Story = {
	render: (args) => (
		<div className="flex flex-col gap-4">
			<Switch {...args} label="Av" />
			<Switch {...args} defaultChecked label="På" />
		</div>
	),
	play: async ({ canvas }) => {
		const off = canvas.getByRole("switch", { name: "Av" });
		const on = canvas.getByRole("switch", { name: "På" });
		await expect(on).toBeChecked();
		// Knotten står til høyre når bryteren er på. Tilstanden formidles altså av
		// mer enn farge, slik WCAG 1.4.1 krever.
		await expect(knobPosition(on)).toBeGreaterThan(knobPosition(off) + 8);
		const trackOff = off.nextElementSibling as HTMLElement;
		const trackOn = on.nextElementSibling as HTMLElement;
		await expect(getComputedStyle(trackOn).backgroundColor).not.toBe(
			getComputedStyle(trackOff).backgroundColor,
		);
	},
};

export const WithSupportingText: Story = {
	args: { supportingText: "Følger systeminnstillingen hvis du lar den stå av." },
	play: async ({ canvas }) => {
		const toggle = canvas.getByRole("switch");
		await expect(toggle).toHaveAccessibleName("Mørkt tema");
		await expect(toggle).toHaveAccessibleDescription(
			"Følger systeminnstillingen hvis du lar den stå av.",
		);
	},
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex flex-col gap-4">
			<Switch {...args} defaultChecked label="Liten" size="sm" />
			<Switch {...args} defaultChecked label="Middels" size="md" />
		</div>
	),
};

export const Disabled: Story = {
	render: (args) => (
		<div className="flex flex-col gap-4">
			<Switch {...args} disabled label="Deaktivert og av" />
			<Switch {...args} defaultChecked disabled label="Deaktivert og på" />
		</div>
	),
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("switch", { name: "Deaktivert og av" })).toBeDisabled();
	},
};

export const ErrorState: Story = {
	name: "Error",
	args: {
		label: "Del profilen min",
		error: "Vi får ikke lagret innstillingen. Prøv igjen.",
	},
	play: async ({ canvas }) => {
		const toggle = canvas.getByRole("switch");
		await expect(toggle).toHaveAttribute("aria-invalid", "true");
		await expect(toggle).toHaveAccessibleDescription(
			"Vi får ikke lagret innstillingen. Prøv igjen.",
		);
		await expect(canvas.getByRole("alert")).toBeInTheDocument();

		// Feilen skal også synes på selve sporet, ikke bare i teksten under.
		// Ringen ligger utenpå sporet, ikke som border inni: inni sto rødt mot
		// sporfyllet på 1.7:1 i lyst tema og forsvant helt i mørkt.
		const track = toggle.nextElementSibling as HTMLElement;
		const errorColor = getComputedStyle(document.documentElement)
			.getPropertyValue("--stroke-error-strong")
			.trim();
		await expect(getComputedStyle(track).boxShadow).toContain(errorColor);

		// Og den må overleve fokus. Lå fokusringen på samme offset, ville den
		// tegnes oppå og den røde kanten forsvinne akkurat idet brukeren står i
		// kontrollen for å rette feilen.
		await userEvent.tab();
		await expect(toggle).toHaveFocus();
		const withFocus = getComputedStyle(track);
		await expect(withFocus.boxShadow).toContain(errorColor);
		await expect(withFocus.outlineWidth).toBe("2px");
		await expect(withFocus.outlineOffset).toBe("4px");
	},
};

export const Toggling: Story = {
	play: async ({ args, canvas }) => {
		const toggle = canvas.getByRole("switch");
		await userEvent.click(toggle);
		await expect(toggle).toBeChecked();
		await expect(toggle).toHaveAttribute("aria-checked", "true");
		await expect(args.onChange).toHaveBeenLastCalledWith(true);
		await userEvent.click(toggle);
		await expect(toggle).toHaveAttribute("aria-checked", "false");
		await expect(args.onChange).toHaveBeenLastCalledWith(false);
	},
};

export const Keyboard: Story = {
	play: async ({ args, canvas }) => {
		const toggle = canvas.getByRole("switch");
		await userEvent.tab();
		await expect(toggle).toHaveFocus();
		const track = toggle.nextElementSibling as HTMLElement;
		await expect(getComputedStyle(track).outlineWidth).toBe("2px");
		// Mellomrom slår bryteren, slik role="switch" lover.
		await userEvent.keyboard(" ");
		await expect(toggle).toBeChecked();
		await expect(args.onChange).toHaveBeenLastCalledWith(true);
	},
};

function ControlledToggle(args: ComponentProps<typeof Switch>) {
	const [on, setOn] = useState(false);
	return (
		<div className="flex flex-col gap-2">
			<Switch
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
	render: (args) => <ControlledToggle {...args} />,
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("switch"));
		await expect(canvas.getByText("Tilstand: på")).toBeInTheDocument();
	},
};
