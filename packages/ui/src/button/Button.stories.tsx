import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Button } from "./Button.tsx";

const meta: Meta<typeof Button> = {
	title: "Components/Button",
	component: Button,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { children: "Følg selskapet" },
	argTypes: {
		variant: {
			control: "inline-radio",
			options: ["primary", "secondary", "tertiary", "brand-tertiary", "destructive"],
		},
		size: { control: "inline-radio", options: ["sm", "md", "lg", "xl"] },
		// Arvet fra ButtonHTMLAttributes. Ikke noe designeren skal skru på.
		type: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Avstanden fra knappens ytterkant til teksten. Alle varianter har samme
 * padding, så tallet skal være det samme uansett variant. En `border` ville
 * spist 1px av innsiden og gjort sekundærknappen 17 der primær er 16.
 */
function textInset(button: HTMLElement) {
	const text = button.querySelector("span");
	if (!text) throw new Error("knappen har ingen tekstnode");
	return Math.round(text.getBoundingClientRect().left - button.getBoundingClientRect().left);
}

export const Primary: Story = {
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button");

		// Vaktpost, ikke en test av knappen: fanger at Tailwind har falt ut av
		// testoppsettet. Uten stiler består enhver kontrastsjekk trivielt.
		await expect(getComputedStyle(button).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");

		// px-4 på md. Målet gjentas i Secondary; spriker de to, er kanten
		// tilbake som `border` og teksten står ikke likt mellom variantene.
		await expect(textInset(button)).toBe(16);

		// --duration-fast, ikke --duration-base. 180ms er Tailwind-standarden
		// i tokenfila og er trått for en flate under pekeren.
		await expect(getComputedStyle(button).transitionDuration).toBe("0.12s");
	},
};

export const Secondary: Story = {
	args: { variant: "secondary" },
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button");

		// Hårstreken er en innvendig ring, ikke en border. Med border ville
		// innrykket blitt 17 og teksten stått ett hakk lenger inn enn i
		// primærknappen ved siden av.
		await expect(textInset(button)).toBe(16);
		await expect(getComputedStyle(button).borderLeftWidth).toBe("0px");
	},
};

export const Tertiary: Story = { args: { variant: "tertiary" } };

export const BrandTertiary: Story = {
	args: { variant: "brand-tertiary" },
};

export const Destructive: Story = {
	args: { variant: "destructive", children: "Slett varsel" },
};

export const WithIcons: Story = {
	args: { leadingIcon: "Plus", trailingIcon: "ArrowRight" },
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex items-center gap-3">
			<Button {...args} size="sm" />
			<Button {...args} size="md" />
			<Button {...args} size="lg" />
			<Button {...args} size="xl" />
		</div>
	),
};

export const Loading: Story = {
	args: { loading: true },
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button");
		await expect(button).toBeDisabled();
		await expect(button).toHaveAttribute("aria-busy", "true");

		// Practical UI bruker Feathers `Loader`: åtte eiker. `LoaderCircle` er
		// en enkelt bue og et annet ikon - begge finnes i lucide, og det er
		// lett å plukke feil.
		const spinner = button.querySelector("svg");
		await expect(spinner).toHaveClass("lucide-loader");
		await expect(spinner?.querySelectorAll("path")).toHaveLength(8);
	},
};

export const Disabled: Story = { args: { disabled: true } };

export const FullWidth: Story = {
	args: { fullWidth: true },
	parameters: { layout: "padded" },
};
