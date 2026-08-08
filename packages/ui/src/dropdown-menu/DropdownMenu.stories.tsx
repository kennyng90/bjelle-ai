import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { DropdownMenu, type DropdownMenuEntry } from "./DropdownMenu.tsx";

const options: DropdownMenuEntry[] = [
	{ label: "Rediger", icon: "Pencil", shortcut: "⌘E" },
	{ label: "Dupliser", icon: "Copy", shortcut: "⌘D" },
	{ label: "Del", icon: "Share2" },
	{ divider: true },
	{ label: "Slett", icon: "Trash2", danger: true },
];

const meta: Meta<typeof DropdownMenu> = {
	title: "Components/DropdownMenu",
	component: DropdownMenu,
	tags: ["autodocs"],
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component: [
					"Kommandomeny etter ARIA-mønsteret «menu button». Utløseren er en `<button>`",
					'med `aria-haspopup="menu"` og `aria-expanded`; menyen er `role="menu"` med',
					'`role="menuitem"`. Piltaster flytter mellom valgene, Escape lukker og',
					"returnerer fokus til utløseren, Tab lukker, og klikk utenfor lukker.",
					"Menyen finnes ikke i DOM-en når den er lukket.",
					"",
					"Menu-rollen er valgt fordi valgene er handlinger. Er innholdet",
					"navigasjonslenker, bruk en `<ul>` med `<a>` i stedet - menu-rollen forteller",
					"skjermleseren at Enter utfører en kommando, ikke at den bytter side.",
					"",
					"**Astro-øyer:** komponenten er interaktiv og MÅ monteres med `client:load`",
					"(eller `client:visible` hvis den ligger under folden) i `apps/web`. Uten",
					"direktiv rendres bare utløseren, og den åpner ingenting.",
				].join("\n"),
			},
		},
	},
	args: { trigger: "Handlinger", items: options },
	argTypes: {
		align: { control: "inline-radio", options: ["start", "end"] },
		dir: { table: { disable: true } },
		slot: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const trigger = canvas.getByRole("button", { name: /Handlinger/ });

		// Vaktpost mot at Tailwind faller ut av testoppsettet.
		await expect(getComputedStyle(trigger).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");

		await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
		await expect(trigger).toHaveAttribute("aria-expanded", "false");
		// Lukket meny skal ikke ligge i DOM-en i det hele tatt.
		await expect(canvas.queryByRole("menu")).toBeNull();
	},
};

export const Open: Story = {
	args: { defaultOpen: true },
	play: async ({ canvas }) => {
		const menu = canvas.getByRole("menu");
		await expect(menu).toBeVisible();
		await expect(canvas.getAllByRole("menuitem")).toHaveLength(4);
		await expect(canvas.getByRole("separator")).toBeInTheDocument();
	},
};

export const Keyboard: Story = {
	args: { onOpenChange: fn() },
	play: async ({ canvas, args }) => {
		const trigger = canvas.getByRole("button", { name: /Handlinger/ });

		// Åpne med tastatur, ikke mus.
		trigger.focus();
		await userEvent.keyboard("{ArrowDown}");

		await expect(trigger).toHaveAttribute("aria-expanded", "true");
		await expect(args.onOpenChange).toHaveBeenCalledWith(true);

		// Fokus skal flyttes inn i menyen, på første valg.
		const menuItems = canvas.getAllByRole("menuitem");
		await expect(menuItems[0]).toHaveFocus();

		// Piltaster flytter mellom valgene, og går rundt på kanten.
		await userEvent.keyboard("{ArrowDown}");
		await expect(menuItems[1]).toHaveFocus();
		await userEvent.keyboard("{ArrowUp}{ArrowUp}");
		await expect(menuItems[3]).toHaveFocus();
		await userEvent.keyboard("{Home}");
		await expect(menuItems[0]).toHaveFocus();
		await userEvent.keyboard("{End}");
		await expect(menuItems[3]).toHaveFocus();

		// Escape lukker OG gir fokus tilbake til utløseren.
		await userEvent.keyboard("{Escape}");
		await expect(canvas.queryByRole("menu")).toBeNull();
		await expect(trigger).toHaveFocus();
	},
};

export const OpensBackwards: Story = {
	play: async ({ canvas }) => {
		const trigger = canvas.getByRole("button", { name: /Handlinger/ });
		trigger.focus();
		// Pil opp skal åpne menyen på siste valg.
		await userEvent.keyboard("{ArrowUp}");
		const menuItems = canvas.getAllByRole("menuitem");
		await expect(menuItems[menuItems.length - 1]).toHaveFocus();
	},
};

export const SelectsAction: Story = {
	args: {
		items: [
			{ label: "Rediger", icon: "Pencil", onSelect: fn() },
			{ label: "Dupliser", icon: "Copy", onSelect: fn() },
		],
	},
	play: async ({ canvas, args }) => {
		const trigger = canvas.getByRole("button", { name: /Handlinger/ });
		trigger.focus();
		await userEvent.keyboard("{Enter}");
		await userEvent.keyboard("{ArrowDown}{Enter}");

		const selected = args.items[1];
		if ("divider" in selected) throw new Error("Forventet et menyvalg, ikke en skillelinje");
		await expect(selected.onSelect).toHaveBeenCalledTimes(1);

		// Menyen lukkes og fokus kommer tilbake til utløseren etter en handling.
		await expect(canvas.queryByRole("menu")).toBeNull();
		await expect(trigger).toHaveFocus();
	},
};

export const ClosesOnOutsideClick: Story = {
	render: (args) => (
		<div className="flex items-center gap-6">
			<DropdownMenu {...args} />
			<button className="text-small text-text-weak" type="button">
				Utenfor
			</button>
		</div>
	),
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: /Handlinger/ }));
		await expect(canvas.getByRole("menu")).toBeVisible();

		await userEvent.click(canvas.getByRole("button", { name: "Utenfor" }));
		await expect(canvas.queryByRole("menu")).toBeNull();
	},
};

export const ClosesWithTab: Story = {
	render: (args) => (
		<div className="flex items-center gap-6">
			<DropdownMenu {...args} />
			<button className="text-small text-text-weak" type="button">
				Etter menyen
			</button>
		</div>
	),
	play: async ({ canvas }) => {
		const trigger = canvas.getByRole("button", { name: /Handlinger/ });
		trigger.focus();
		await userEvent.keyboard("{ArrowDown}");
		await expect(canvas.getAllByRole("menuitem")[0]).toHaveFocus();

		await userEvent.tab();

		// Tab lukker menyen og lar fokus gå videre til neste element på siden.
		// Menyvalgene har tabIndex -1, så de blir ikke liggende i tabrekkefølgen.
		await expect(canvas.queryByRole("menu")).toBeNull();
		await expect(canvas.getByRole("button", { name: "Etter menyen" })).toHaveFocus();
	},
};

export const RightAligned: Story = {
	args: { align: "end", defaultOpen: true },
	parameters: { layout: "padded" },
	render: (args) => (
		<div className="flex justify-end">
			<DropdownMenu {...args} />
		</div>
	),
};

export const IconTrigger: Story = {
	args: {
		trigger: null,
		triggerProps: {
			"aria-label": "Flere handlinger",
			leadingIcon: "Ellipsis",
			trailingIcon: undefined,
			// secondary, ikke tertiary: en tertiary utløser uten tekst har verken
			// flate eller kant, og storyen så ut som tre løse prikker på hvitt.
			variant: "secondary",
		},
	},
	play: async ({ canvas }) => {
		// Ikonet alene er ikke et navn - utløseren må ha aria-label.
		await expect(canvas.getByRole("button", { name: "Flere handlinger" })).toBeInTheDocument();
	},
};

export const Empty: Story = {
	args: { items: [], defaultOpen: true },
	play: async ({ canvas }) => {
		const empty = canvas.getByRole("menuitem", { name: "Ingen valg" });
		await expect(empty).toHaveAttribute("aria-disabled", "true");
	},
};
