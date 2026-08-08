import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import { SideNav, type SideNavEntry } from "./SideNav.tsx";

const flatPages: SideNavEntry[] = [
	{ value: "oversikt", label: "Oversikt", icon: "LayoutDashboard" },
	{ value: "innboks", label: "Innboks", icon: "Inbox", badge: 12 },
	{ value: "dokumenter", label: "Dokumenter", icon: "FileText" },
	{ value: "rapporter", label: "Rapporter", icon: "ChartColumn" },
];

const groupedPages: SideNavEntry[] = [
	{ value: "oversikt", label: "Oversikt", icon: "LayoutDashboard" },
	{
		group: "Arbeidsflate",
		items: [
			{ value: "innboks", label: "Innboks", icon: "Inbox", badge: 12 },
			{ value: "dokumenter", label: "Dokumenter", icon: "FileText" },
			{ value: "rapporter", label: "Rapporter", icon: "ChartColumn" },
		],
	},
	{
		group: "Administrasjon",
		items: [
			{ value: "brukere", label: "Brukere", icon: "Users", badge: 3 },
			{ value: "innstillinger", label: "Innstillinger", icon: "Settings" },
		],
	},
];

const meta: Meta<typeof SideNav> = {
	title: "Components/SideNav",
	component: SideNav,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component: [
					"Vertikal applikasjonsmeny. `<nav aria-label>` rundt en `<ul>`, med nøstede",
					'lister for grupper. Aktivt element får `aria-current="page"` - ikke bare',
					"en farget bakgrunn - og en loddrett merkestrek, slik at tilstanden ikke",
					"formidles med farge alene.",
					"",
					"**Astro-øyer:** menyen er statisk så lenge elementene har `href`. Bruker du",
					"`onSelect` eller `onCollapsedChange` er den interaktiv og må monteres med",
					"`client:load` i `apps/web` - uten direktiv rendres den som død HTML.",
				].join("\n"),
			},
		},
	},
	args: { items: groupedPages, value: "innboks" },
	argTypes: {
		// Arvet fra HTMLAttributes. Ikke noe designeren skal skru på.
		dir: { table: { disable: true } },
		slot: { table: { disable: true } },
		width: { control: { type: "number" } },
	},
	decorators: [
		(Story) => (
			<div className="flex h-160 bg-background-sunken">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { items: flatPages },
	play: async ({ canvas }) => {
		const menu = canvas.getByRole("navigation", { name: "Hovedmeny" });

		// Vaktpost: fanger at Tailwind har falt ut av testoppsettet. Uten stiler
		// består enhver kontrastsjekk trivielt.
		await expect(getComputedStyle(menu).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");

		// Aktiv side skal være maskinlesbar, ikke bare farget.
		const active = canvas.getByRole("button", { name: /Innboks/ });
		await expect(active).toHaveAttribute("aria-current", "page");
		await expect(canvas.getByRole("button", { name: /Oversikt/ })).not.toHaveAttribute(
			"aria-current",
		);
	},
};

export const WithGroups: Story = {
	play: async ({ canvas }) => {
		// Gruppene skal være nøstede lister med eget tilgjengelig navn.
		await expect(canvas.getByRole("list", { name: "Arbeidsflate" })).toBeInTheDocument();
		await expect(canvas.getByRole("list", { name: "Administrasjon" })).toBeInTheDocument();
	},
};

export const AsLinks: Story = {
	args: {
		items: [
			{ value: "oversikt", label: "Oversikt", icon: "LayoutDashboard", href: "#oversikt" },
			{ value: "innboks", label: "Innboks", icon: "Inbox", href: "#innboks", badge: 12 },
			{ value: "rapporter", label: "Rapporter", icon: "ChartColumn", href: "#rapporter" },
		],
	},
	play: async ({ canvas }) => {
		const active = canvas.getByRole("link", { name: /Innboks/ });
		await expect(active).toHaveAttribute("aria-current", "page");
		await expect(active).toHaveAttribute("href", "#innboks");
	},
};

export const WithBrandAndFooter: Story = {
	args: {
		brand: <span className="text-h4 font-strong text-text-strong">Bjelle</span>,
		footer: (
			<p className="px-3 text-tiny text-text-weak">
				Innlogget som <span className="font-strong text-text-strong">Ida Berg</span>
			</p>
		),
	},
};

export const Collapsed: Story = {
	args: { collapsed: true },
	play: async ({ canvas }) => {
		// Ikoner alene er ikke et navn. Etiketten skal fortsatt finnes, bare
		// visuelt skjult.
		for (const name of ["Oversikt", "Dokumenter", "Brukere", "Innstillinger"]) {
			await expect(canvas.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
		}
		// Merkelappen må også overleve sammenslåingen.
		await expect(canvas.getByRole("button", { name: "Innboks 12" })).toBeInTheDocument();
		// Gruppene beholder navnet sitt selv om overskriften er skjult.
		await expect(canvas.getByRole("list", { name: "Arbeidsflate" })).toBeInTheDocument();
	},
};

function SideNavWithButton() {
	const [collapsed, setCollapsed] = useState(false);
	const [value, setValue] = useState("innboks");

	return (
		<SideNav
			brand={<span className="text-h4 font-strong text-text-strong">B</span>}
			collapsed={collapsed}
			items={groupedPages}
			onCollapsedChange={setCollapsed}
			onSelect={setValue}
			value={value}
		/>
	);
}

export const WithCollapseButton: Story = {
	render: () => <SideNavWithButton />,
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button", { name: "Slå sammen menyen" });
		await expect(button).toHaveAttribute("aria-expanded", "true");

		await userEvent.click(button);

		const expand = canvas.getByRole("button", { name: "Utvid menyen" });
		await expect(expand).toHaveAttribute("aria-expanded", "false");
		// Etikettene skal fortsatt være tilgjengelige etter sammenslåing.
		await expect(canvas.getByRole("button", { name: "Innboks 12" })).toBeInTheDocument();
	},
};

export const Keyboard: Story = {
	args: { items: flatPages },
	play: async ({ canvas }) => {
		const first = canvas.getByRole("button", { name: /Oversikt/ });
		await userEvent.tab();
		await expect(first).toHaveFocus();

		// Fokusringen må ikke klippes av rullelisten. `outline-offset-2` trenger
		// 4 px klaring mellom elementet og kanten på containeren som klipper.
		const list = first.closest("ul");
		if (list === null) throw new Error("Fant ingen <ul> rundt menyelementet");
		const clearance = first.getBoundingClientRect().left - list.getBoundingClientRect().left;
		await expect(clearance).toBeGreaterThanOrEqual(4);
	},
};
