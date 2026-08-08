import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { IconButton } from "./IconButton.tsx";

const meta: Meta<typeof IconButton> = {
	title: "Components/IconButton",
	component: IconButton,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { icon: "Ellipsis", label: "Flere valg" },
	argTypes: {
		variant: {
			control: "inline-radio",
			options: ["primary", "secondary", "tertiary", "brand-tertiary", "destructive"],
		},
		size: { control: "inline-radio", options: ["sm", "md", "lg", "xl"] },
		shape: { control: "inline-radio", options: ["rounded", "circle"] },
		// Arvet fra ButtonHTMLAttributes. Ikke noe designeren skal skru på.
		type: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Tertiary: Story = {
	play: async ({ canvas }) => {
		// Knappen har ingen synlig tekst. `label` er eneste kilde til navnet,
		// og hele poenget med at proppen er påkrevd.
		const button = canvas.getByRole("button", { name: "Flere valg" });
		await expect(button).toBeInTheDocument();
	},
};

export const Primary: Story = {
	args: { variant: "primary", icon: "Plus", label: "Legg til" },
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button");

		// Vaktpost: fanger at Tailwind har falt ut av testoppsettet. Uten stiler
		// består enhver kontrastsjekk trivielt.
		await expect(getComputedStyle(button).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");

		// --duration-fast, samme tempo som Button. Tokenfilas Tailwind-standard
		// er 180ms og er trått for en flate under pekeren.
		await expect(getComputedStyle(button).transitionDuration).toBe("0.12s");
	},
};

export const Secondary: Story = {
	args: { variant: "secondary", icon: "Pencil", label: "Rediger" },
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button");

		// Hårstreken er en innvendig ring, ikke en border. Samme valg som i
		// Button, der en border ville flyttet teksten 1px.
		await expect(getComputedStyle(button).borderLeftWidth).toBe("0px");

		// Boksen er kvadratisk. En border ville ikke endret den, men en feil
		// størrelsesklasse ville - og 40x40 er md.
		const box = button.getBoundingClientRect();
		await expect(box.width).toBe(40);
		await expect(box.height).toBe(40);
	},
};

export const BrandTertiary: Story = {
	name: "Brand tertiary",
	args: { variant: "brand-tertiary", icon: "Share2", label: "Del" },
};

export const Destructive: Story = {
	args: { variant: "destructive", icon: "Trash2", label: "Slett" },
};

export const Circle: Story = {
	args: { shape: "circle", variant: "secondary", icon: "Search", label: "Søk" },
};

export const Sizes: Story = {
	args: { variant: "secondary" },
	render: (args) => (
		<div className="flex items-center gap-3">
			<IconButton {...args} label="Flere valg, liten" size="sm" />
			<IconButton {...args} label="Flere valg, medium" size="md" />
			<IconButton {...args} label="Flere valg, stor" size="lg" />
			<IconButton {...args} label="Flere valg, størst" size="xl" />
		</div>
	),
	play: async ({ canvas }) => {
		// WCAG 2.2 SC 2.5.8: treffflaten må være minst 24x24 CSS-piksler.
		// Den minste varianten er den eneste som kan bryte grensen.
		const smallest = canvas.getByRole("button", { name: "Flere valg, liten" });
		const box = smallest.getBoundingClientRect();
		await expect(box.width).toBeGreaterThanOrEqual(24);
		await expect(box.height).toBeGreaterThanOrEqual(24);
	},
};

export const Loading: Story = {
	args: { loading: true, variant: "primary", icon: "Plus", label: "Legg til" },
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button");
		await expect(button).toBeDisabled();
		await expect(button).toHaveAttribute("aria-busy", "true");

		// Feathers `Loader` - åtte eiker. `LoaderCircle` er en enkelt bue og et
		// annet ikon; begge finnes i lucide.
		const spinner = button.querySelector("svg");
		await expect(spinner).toHaveClass("lucide-loader");
		await expect(spinner?.querySelectorAll("path")).toHaveLength(8);
	},
};

export const Disabled: Story = {
	args: { disabled: true, variant: "secondary" },
};

export const Keyboard: Story = {
	args: { variant: "secondary", onClick: fn() },
	play: async ({ args, canvas }) => {
		const button = canvas.getByRole("button", { name: "Flere valg" });

		await userEvent.tab();
		await expect(button).toHaveFocus();

		// Fokusringen er 2px outline. Faller `focus-visible`-regelen ut, blir
		// dette "0px" og knappen er usynlig for tastaturbrukere.
		const ring = getComputedStyle(button);
		await expect(ring.outlineWidth).toBe("2px");
		await expect(ring.outlineStyle).not.toBe("none");

		await userEvent.keyboard("{Enter}");
		await expect(args.onClick).toHaveBeenCalledTimes(1);

		await userEvent.keyboard(" ");
		await expect(args.onClick).toHaveBeenCalledTimes(2);
	},
};
