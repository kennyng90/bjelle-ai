import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import { Button } from "../button/Button.tsx";
import { Icon } from "../icon/Icon.tsx";
import { IconButton } from "../icon-button/IconButton.tsx";
import { SideNav } from "../side-nav/SideNav.tsx";
import { Header } from "./Header.tsx";
import { SkipLink } from "./SkipLink.tsx";

function Brand() {
	return (
		<span className="flex items-center gap-2">
			<span className="flex size-8 items-center justify-center rounded-8 bg-fill-brand-strong text-small font-bold text-text-on-strong">
				B
			</span>
			<span className="text-body font-strong text-text-strong">Bjelle</span>
		</span>
	);
}

function TopLinks() {
	return (
		<ul className="flex items-center gap-1">
			{[
				["Oversikt", "#oversikt", true],
				["Prosjekter", "#prosjekter", false],
				["Rapporter", "#rapporter", false],
			].map(([text, href, active]) => (
				<li key={href as string}>
					<a
						aria-current={active ? "page" : undefined}
						className={[
							"flex h-10 items-center rounded-8 px-3 text-small font-medium transition-colors",
							"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
							active
								? "bg-fill-brand-weak text-text-brand"
								: "text-text-weak hover:bg-fill-hover hover:text-text-strong",
						].join(" ")}
						href={href as string}
					>
						{text}
					</a>
				</li>
			))}
		</ul>
	);
}

function SearchField() {
	return (
		<search className="w-full max-w-96">
			<form>
				<label className="sr-only" htmlFor="header-search">
					Søk i arbeidsflaten
				</label>
				<div className="relative">
					<Icon
						className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-icon-neutral"
						name="Search"
						size={16}
					/>
					<input
						className="h-10 w-full rounded-8 border border-stroke-weak bg-background-sunken pr-3 pl-9 text-small text-text-strong placeholder:text-text-weak focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus"
						id="header-search"
						placeholder="Søk i arbeidsflaten"
						type="search"
					/>
				</div>
			</form>
		</search>
	);
}

function Actions() {
	return (
		<>
			<IconButton icon="Bell" label="Varsler" size="md" variant="tertiary" />
			<Button leadingIcon="CircleUser" size="md" variant="secondary">
				Ida Berg
			</Button>
		</>
	);
}

const meta: Meta<typeof Header> = {
	title: "Components/Header",
	component: Header,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component: [
					"Topplinjen i applikasjonsskallet. `<header>` med tre slots, der `center`",
					"pakkes i en `<nav>` med eget tilgjengelig navn.",
					"",
					"Er headeren sidens topp, gi den `skipTo` slik at «Hopp til innhold» blir",
					"det første fokuserbare elementet på siden.",
					"",
					"**Astro-øyer:** headeren er statisk så lenge du bare fyller slots med",
					"lenker. Sender du `onMenuToggle`, eller legger interaktivt innhold i en",
					"slot, må øya monteres med `client:load` i `apps/web`.",
				].join("\n"),
			},
		},
	},
	args: {
		left: <Brand />,
		center: <TopLinks />,
		right: <Actions />,
	},
	argTypes: {
		dir: { table: { disable: true } },
		slot: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const header = canvas.getByRole("banner");
		await expect(getComputedStyle(header).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
		// Navigasjonen inni headeren må ha eget navn, ellers er den bare «navigation».
		await expect(canvas.getByRole("navigation", { name: "Toppmeny" })).toBeInTheDocument();
	},
};

export const WithSearch: Story = {
	// Søk er ikke navigasjon. Tom navLabel dropper <nav>-landemerket rundt slotten.
	args: { center: <SearchField />, navLabel: "" },
	play: async ({ canvas }) => {
		// Søkefeltet må ha navn. Placeholder alene holder ikke.
		await expect(canvas.getByRole("searchbox", { name: "Søk i arbeidsflaten" })).toBeVisible();
	},
};

export const BrandAndActionsOnly: Story = {
	args: { center: undefined },
};

function HeaderWithMenu() {
	const [open, setOpen] = useState(false);

	return (
		<div>
			<Header
				center={<TopLinks />}
				left={<Brand />}
				menuControls="app-skall-meny"
				menuOpen={open}
				onMenuToggle={setOpen}
				right={<Actions />}
			/>
			{/* Tailwinds `hidden`-utility, ikke hidden-attributtet: preflight legger
			    [hidden] i :where() og taper mot en display-klasse. */}
			<div className={open ? "flex h-96" : "hidden"} id="app-skall-meny">
				<SideNav
					items={[
						{ value: "oversikt", label: "Oversikt", icon: "LayoutDashboard", href: "#oversikt" },
						{ value: "innboks", label: "Innboks", icon: "Inbox", href: "#innboks", badge: 4 },
					]}
					value="oversikt"
				/>
			</div>
		</div>
	);
}

export const WithMenuButton: Story = {
	render: () => <HeaderWithMenu />,
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button", { name: "Åpne meny" });
		await expect(button).toHaveAttribute("aria-expanded", "false");

		// aria-controls må peke på et element som faktisk finnes.
		const controls = button.getAttribute("aria-controls");
		await expect(controls).toBe("app-skall-meny");
		await expect(document.getElementById(controls ?? "")).not.toBeNull();

		await userEvent.click(button);
		await expect(canvas.getByRole("button", { name: "Lukk meny" })).toHaveAttribute(
			"aria-expanded",
			"true",
		);
	},
};

function FullShell() {
	return (
		<div className="flex h-160 flex-col">
			<Header
				center={<SearchField />}
				left={<Brand />}
				navLabel=""
				right={<Actions />}
				skipTo="#innhold"
			/>
			<div className="flex min-h-0 flex-1">
				<SideNav
					footer={<p className="px-3 text-tiny text-text-weak">Versjon 2.4.0</p>}
					items={[
						{ value: "oversikt", label: "Oversikt", icon: "LayoutDashboard", href: "#oversikt" },
						{
							group: "Arbeidsflate",
							items: [
								{ value: "innboks", label: "Innboks", icon: "Inbox", href: "#innboks", badge: 12 },
								{
									value: "rapporter",
									label: "Rapporter",
									icon: "ChartColumn",
									href: "#rapporter",
								},
							],
						},
					]}
					value="innboks"
				/>
				<main className="flex-1 overflow-auto bg-background-sunken p-6" id="innhold" tabIndex={-1}>
					<h1 className="text-h3 font-strong text-text-strong">Innboks</h1>
					<p className="mt-2 text-body text-text-weak">
						Tolv saker venter på behandling. Skallet består av Header på toppen og SideNav til
						venstre.
					</p>
				</main>
			</div>
		</div>
	);
}

export const FullShellStory: Story = {
	name: "Full Shell",
	render: () => <FullShell />,
	play: async ({ canvas }) => {
		// Hopp til innhold skal være det aller første fokuserbare elementet.
		await userEvent.tab();
		const skipLink = canvas.getByRole("link", { name: "Hopp til innhold" });
		await expect(skipLink).toHaveFocus();

		// ... og synlig når den har fokus. Bredden avslører om den fortsatt er
		// klippet bort av sr-only-teknikken.
		await expect(skipLink.getBoundingClientRect().width).toBeGreaterThan(40);
		await expect(skipLink).toHaveAttribute("href", "#innhold");
		await expect(document.getElementById("innhold")).not.toBeNull();
	},
};

export const SkipToContent: Story = {
	render: () => (
		<div className="relative h-40 bg-background-sunken p-6">
			<SkipLink href="#demo-innhold" />
			<p className="text-body text-text-weak">
				Lenken er skjult til den får tastaturfokus. Trykk Tab.
			</p>
			<p className="mt-4 text-body text-text-strong" id="demo-innhold">
				Her begynner innholdet.
			</p>
		</div>
	),
	play: async ({ canvas }) => {
		const skipLink = canvas.getByRole("link", { name: "Hopp til innhold" });
		// Skjult før fokus.
		await expect(skipLink.getBoundingClientRect().width).toBeLessThan(4);
		await userEvent.tab();
		await expect(skipLink).toHaveFocus();
		await expect(skipLink.getBoundingClientRect().width).toBeGreaterThan(40);
	},
};
