import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Breadcrumbs } from "./Breadcrumbs.tsx";

const meta: Meta<typeof Breadcrumbs> = {
	title: "Components/Breadcrumbs",
	component: Breadcrumbs,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
	args: {
		items: [
			{ label: "Hjem", href: "/" },
			{ label: "Rapporter", href: "/rapporter" },
			{ label: "Kvartalstall" },
		],
	},
	argTypes: {
		items: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const nav = canvas.getByRole("navigation", { name: "Brødsmuler" });
		await expect(nav).toBeInTheDocument();

		// Siste ledd er gjeldende side: merket, og ikke en lenke.
		const current = canvas.getByText("Kvartalstall");
		await expect(current).toHaveAttribute("aria-current", "page");
		await expect(canvas.queryByRole("link", { name: "Kvartalstall" })).toBeNull();
		await expect(canvas.getAllByRole("link")).toHaveLength(2);

		await expect(canvas.getAllByRole("listitem")).toHaveLength(3);

		// Skilletegnet er dekorativt: får det et navn, dukker det opp som
		// bilde i tilgjengelighetstreet og leses mellom hvert ledd.
		await expect(canvas.queryAllByRole("img")).toHaveLength(0);
	},
};

export const WithIcon: Story = {
	args: {
		items: [
			{ label: "Hjem", href: "/", icon: "House" },
			{ label: "Prosjekter", href: "/prosjekter", icon: "FileText" },
			{ label: "Nordlys" },
		],
	},
};

export const TwoLevels: Story = {
	args: {
		items: [{ label: "Hjem", href: "/" }, { label: "Innstillinger" }],
	},
};

export const DeepPath: Story = {
	args: {
		items: [
			{ label: "Hjem", href: "/" },
			{ label: "Organisasjon", href: "/organisasjon" },
			{ label: "Avdelinger", href: "/organisasjon/avdelinger" },
			{ label: "Kundeservice", href: "/organisasjon/avdelinger/kundeservice" },
			{ label: "Bemanning", href: "/organisasjon/avdelinger/kundeservice/bemanning" },
		],
	},
	play: async ({ canvas }) => {
		// Siste ledd har href her, men er likevel gjeldende side og skal ikke
		// bli en lenke til der brukeren allerede står.
		await expect(canvas.queryByRole("link", { name: "Bemanning" })).toBeNull();
		await expect(canvas.getByText("Bemanning")).toHaveAttribute("aria-current", "page");
		await expect(canvas.getAllByRole("link")).toHaveLength(4);
	},
};

export const CurrentPageOnly: Story = {
	args: { items: [{ label: "Hjem" }] },
	play: async ({ canvas }) => {
		await expect(canvas.queryAllByRole("link")).toHaveLength(0);
		await expect(canvas.getByText("Hjem")).toHaveAttribute("aria-current", "page");
	},
};
