import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { expect, fn, userEvent } from "storybook/test";
import { Radio } from "./Radio.tsx";

const meta: Meta<typeof Radio> = {
	title: "Components/Radio",
	component: Radio,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Radioknapp for ett valg av flere. Den hører alltid hjemme i en gruppe: legg søsknene i et <fieldset> med <legend> og gi dem samme name, ellers får ikke brukeren vite hva valget gjelder. Kontrollen er interaktiv: i apps/web må øya monteres med client:load (client:visible under folden).",
			},
		},
	},
	tags: ["autodocs"],
	args: {
		name: "abonnement",
		value: "pro",
		label: "Pro",
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
		const button = canvas.getByRole<HTMLInputElement>("radio", { name: "Pro" });
		await expect(button).not.toBeChecked();
		const ring = button.nextElementSibling as HTMLElement;
		// Vaktpost: uten Tailwind er ringen ustilt og kontrastsjekkene består trivielt.
		await expect(getComputedStyle(ring).borderRadius).toBe("9999px");
		// WCAG 2.5.8: treffflaten skal være minst 24x24.
		const surface = button.getBoundingClientRect();
		await expect(surface.width).toBeGreaterThanOrEqual(24);
		await expect(surface.height).toBeGreaterThanOrEqual(24);
	},
};

export const Selected: Story = {
	render: (args) => (
		<div className="flex flex-col gap-4">
			<Radio {...args} label="Ikke valgt" value="av" />
			<Radio {...args} defaultChecked label="Valgt" value="pa" />
		</div>
	),
	play: async ({ canvas }) => {
		const off = canvas.getByRole("radio", { name: "Ikke valgt" });
		const on = canvas.getByRole("radio", { name: "Valgt" });
		await expect(on).toBeChecked();
		// Prikken skal faktisk vokse fram. Den tegnes av CSS, så den stemmer også
		// når gruppa er ukontrollert.
		const dot = (element: HTMLElement) => {
			const ring = element.nextElementSibling as HTMLElement;
			return (ring.nextElementSibling as HTMLElement).getBoundingClientRect().width;
		};
		await expect(dot(on)).toBeGreaterThan(dot(off));
		const ringOff = off.nextElementSibling as HTMLElement;
		const ringOn = on.nextElementSibling as HTMLElement;
		await expect(getComputedStyle(ringOn).backgroundColor).not.toBe(
			getComputedStyle(ringOff).backgroundColor,
		);
	},
};

export const WithSupportingText: Story = {
	args: { supportingText: "Ubegrenset antall stillinger og fem brukere." },
	play: async ({ canvas }) => {
		const button = canvas.getByRole("radio");
		await expect(button).toHaveAccessibleName("Pro");
		await expect(button).toHaveAccessibleDescription(
			"Ubegrenset antall stillinger og fem brukere.",
		);
	},
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex flex-col gap-4">
			<Radio {...args} label="Liten" size="sm" value="liten" />
			<Radio {...args} label="Middels" size="md" value="middels" />
		</div>
	),
};

export const Disabled: Story = {
	render: (args) => (
		<div className="flex flex-col gap-4">
			<Radio {...args} disabled label="Deaktivert og av" value="av" />
			<Radio {...args} defaultChecked disabled label="Deaktivert og valgt" value="pa" />
		</div>
	),
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("radio", { name: "Deaktivert og av" })).toBeDisabled();
	},
};

export const ErrorState: Story = {
	name: "Error",
	args: { error: "Velg et abonnement for å fortsette." },
	play: async ({ canvas }) => {
		const button = canvas.getByRole("radio");
		await expect(button).toHaveAttribute("aria-invalid", "true");
		await expect(button).toHaveAccessibleDescription("Velg et abonnement for å fortsette.");
		await expect(canvas.getByRole("alert")).toBeInTheDocument();
		// Feilen skal også synes på selve ringen, ikke bare i teksten under.
		const ring = button.nextElementSibling as HTMLElement;
		const errorColor = getComputedStyle(document.documentElement)
			.getPropertyValue("--stroke-error-strong")
			.trim();
		await expect(getComputedStyle(ring).borderTopColor).toBe(errorColor);
	},
};

export const Group: Story = {
	render: (args) => (
		<fieldset className="flex flex-col gap-3 border-0 p-0">
			<legend className="mb-2 text-small font-strong text-text-strong">Velg abonnement</legend>
			<Radio {...args} defaultChecked label="Gratis" value="gratis" />
			<Radio {...args} label="Pro" value="pro" />
			<Radio {...args} label="Bedrift" value="bedrift" />
		</fieldset>
	),
	play: async ({ canvas }) => {
		const group = canvas.getByRole("group", { name: "Velg abonnement" });
		await expect(group).toBeInTheDocument();
		await expect(canvas.getAllByRole("radio")).toHaveLength(3);
	},
};

export const Keyboard: Story = {
	render: (args) => (
		<fieldset className="flex flex-col gap-3 border-0 p-0">
			<legend className="mb-2 text-small font-strong text-text-strong">Velg abonnement</legend>
			<Radio {...args} defaultChecked label="Gratis" value="gratis" />
			<Radio {...args} label="Pro" value="pro" />
			<Radio {...args} label="Bedrift" value="bedrift" />
		</fieldset>
	),
	play: async ({ args, canvas }) => {
		const free = canvas.getByRole("radio", { name: "Gratis" });
		const pro = canvas.getByRole("radio", { name: "Pro" });
		await userEvent.tab();
		await expect(free).toHaveFocus();
		const ring = free.nextElementSibling as HTMLElement;
		await expect(getComputedStyle(ring).outlineWidth).toBe("2px");
		// Piltast flytter valget innad i gruppa. Det er nettopp derfor name deles.
		await userEvent.keyboard("{ArrowDown}");
		await expect(pro).toBeChecked();
		await expect(args.onChange).toHaveBeenLastCalledWith("pro");
	},
};

function ControlledGroup(args: ComponentProps<typeof Radio>) {
	const [selected, setSelected] = useState("gratis");
	const select = (value: string) => {
		setSelected(value);
		args.onChange?.(value);
	};
	return (
		<fieldset className="flex flex-col gap-3 border-0 p-0">
			<legend className="mb-2 text-small font-strong text-text-strong">Velg abonnement</legend>
			<Radio
				{...args}
				checked={selected === "gratis"}
				label="Gratis"
				onChange={select}
				value="gratis"
			/>
			<Radio {...args} checked={selected === "pro"} label="Pro" onChange={select} value="pro" />
			<p className="text-small text-text-weak">Valgt: {selected}</p>
		</fieldset>
	);
}

export const Controlled: Story = {
	render: (args) => <ControlledGroup {...args} />,
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("radio", { name: "Pro" }));
		await expect(canvas.getByText("Valgt: pro")).toBeInTheDocument();
	},
};
