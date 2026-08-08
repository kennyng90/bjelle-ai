import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { Text } from "../text/Text.tsx";
import { TextLink } from "./TextLink.tsx";

const meta: Meta<typeof TextLink> = {
	title: "Components/TextLink",
	component: TextLink,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { children: "Les mer om Bjelle", href: "#les-mer" },
	argTypes: {
		tone: { control: "inline-radio", options: ["brand", "neutral", "error"] },
		size: {
			control: "inline-radio",
			options: ["inherit", "lead", "body", "small", "tiny"],
		},
		underline: { control: "inline-radio", options: ["always", "hover", "none"] },
		weight: {
			control: "inline-radio",
			options: ["regular", "medium", "strong", "bold"],
		},
		// Arvet fra AnchorHTMLAttributes. Bruk `external` i stedet.
		target: { table: { disable: true } },
		rel: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const link = canvas.getByRole("link", { name: "Les mer om Bjelle" });
		// WCAG 1.4.1: lenken skal skille seg fra brødtekst uten at farge er
		// eneste bærer. Understreken er den skillelinja.
		await expect(getComputedStyle(link).textDecorationLine).toBe("underline");

		await userEvent.tab();
		await expect(link).toHaveFocus();
		// Fokusringen er 2 piksler med avstand. Uten den kan ingen som
		// navigerer med tastatur se hvor de er.
		const focused = getComputedStyle(link);
		await expect(focused.outlineWidth).toBe("2px");
		await expect(focused.outlineStyle).not.toBe("none");
		await expect(focused.outlineOffset).toBe("2px");
	},
};

export const Tones: Story = {
	parameters: { layout: "padded" },
	render: (args) => (
		<div className="flex flex-col items-start gap-3">
			<TextLink {...args} tone="brand">
				Merkevare
			</TextLink>
			<TextLink {...args} tone="neutral">
				Nøytral
			</TextLink>
			<TextLink {...args} tone="error">
				Feil
			</TextLink>
		</div>
	),
};

export const Underline: Story = {
	parameters: { layout: "padded" },
	render: (args) => (
		<div className="flex flex-col items-start gap-3">
			<TextLink {...args} underline="always">
				Alltid understreket
			</TextLink>
			<TextLink {...args} underline="hover">
				Understreket ved peker
			</TextLink>
			<TextLink {...args} underline="none">
				Uten understrek
			</TextLink>
		</div>
	),
	play: async ({ canvas }) => {
		await expect(
			getComputedStyle(canvas.getByRole("link", { name: "Alltid understreket" }))
				.textDecorationLine,
		).toBe("underline");
		// `hover` er ikke synlig for noen uten peker. Den finnes fordi kilden
		// hadde den, men er ikke standard her.
		await expect(
			getComputedStyle(canvas.getByRole("link", { name: "Understreket ved peker" }))
				.textDecorationLine,
		).toBe("none");
	},
};

export const Sizes: Story = {
	parameters: { layout: "padded" },
	render: (args) => (
		<div className="flex flex-col items-start gap-3">
			<TextLink {...args} size="lead">
				Lead
			</TextLink>
			<TextLink {...args} size="body">
				Body
			</TextLink>
			<TextLink {...args} size="small">
				Small
			</TextLink>
			<TextLink {...args} size="tiny">
				Tiny
			</TextLink>
			<TextLink {...args}>Arver størrelsen fra teksten rundt</TextLink>
		</div>
	),
	play: async ({ canvas }) => {
		await expect(getComputedStyle(canvas.getByRole("link", { name: "Lead" })).fontSize).toBe(
			"20px",
		);
		await expect(getComputedStyle(canvas.getByRole("link", { name: "Tiny" })).fontSize).toBe(
			"13px",
		);
	},
};

export const WithIcons: Story = {
	parameters: { layout: "padded" },
	args: { trailingIcon: "ArrowRight" },
	render: (args) => (
		<div className="flex flex-col items-start gap-3">
			<TextLink {...args} leadingIcon="ArrowLeft" trailingIcon={undefined}>
				Tilbake til oversikten
			</TextLink>
			<TextLink {...args}>Les mer om Bjelle</TextLink>
			<TextLink {...args} size="small">
				Samme lenke i small
			</TextLink>
		</div>
	),
	play: async ({ canvas }) => {
		// Ikonet skal følge tekststørrelsen, ellers blir baselinjen skjev når
		// lenken brukes i small.
		const small = canvas.getByRole("link", { name: "Samme lenke i small" });
		const icon = small.querySelector("svg");
		await expect(icon).not.toBeNull();
		await expect(getComputedStyle(icon as SVGElement).width).toBe("14px");
		// Dekorative ikoner skal ikke havne i navnet til lenken.
		await expect(icon).toHaveAttribute("aria-hidden", "true");
		// WCAG 2.5.8: en frittstående lenke er ikke omfattet av unntaket for
		// lenker inne i en setning, så trefflata må være minst 24 piksler høy.
		// Med 16 piksler tekst er linja rundt 19, og det holder ikke.
		for (const link of canvas.getAllByRole("link")) {
			await expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
		}
	},
};

export const External: Story = {
	args: { external: true, href: "https://www.w3.org/WAI/", children: "WAI hos W3C" },
	play: async ({ canvas }) => {
		// Åpner lenken i ny fane, må skjermleseren få vite det (WCAG 3.2.5).
		const link = canvas.getByRole("link", { name: /åpner i ny fane/i });
		await expect(link).toHaveAttribute("target", "_blank");
		await expect(link.getAttribute("rel")).toContain("noreferrer");
		// Og seende brukere skal se det samme, uten å måtte hovre.
		await expect(link.querySelector("svg")).not.toBeNull();
	},
};

export const InBodyText: Story = {
	parameters: { layout: "padded" },
	render: (args) => (
		<div className="max-w-[420px]">
			<Text>
				Komponentene rendres på server først. Vil du vite hvorfor det betyr noe, kan du{" "}
				<TextLink {...args} href="#hydrering">
					lese om hydrering av øyer
				</TextLink>{" "}
				før du tar dem i bruk.
			</Text>
		</div>
	),
	play: async ({ canvas }) => {
		const link = canvas.getByRole("link", { name: "lese om hydrering av øyer" });
		// Uten ikoner må lenken være `inline`, ikke `inline-flex`. En
		// inline-flex-lenke nekter å brekke og skyver ut av spalta.
		await expect(getComputedStyle(link).display).toBe("inline");
		await expect(link.getClientRects().length).toBeGreaterThan(1);
	},
};
