import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { IconContainer } from "./IconContainer.tsx";

const meta: Meta<typeof IconContainer> = {
	title: "Components/IconContainer",
	component: IconContainer,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { icon: "Star" },
	argTypes: {
		tone: {
			control: "inline-radio",
			options: ["brand", "neutral", "success", "warning", "error", "info"],
		},
		variant: { control: "inline-radio", options: ["soft", "solid", "outline"] },
		size: { control: "inline-radio", options: ["sm", "md", "lg", "xl"] },
		shape: { control: "inline-radio", options: ["rounded", "circle"] },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas, canvasElement }) => {
		const tile = canvasElement.querySelector("span");
		await expect(tile).not.toBeNull();
		// Vaktpost: uten Tailwind er flata gjennomsiktig, og da måler ingen
		// kontrastsjekk noe som helst.
		const style = getComputedStyle(tile as HTMLElement);
		await expect(style.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
		await expect(style.width).toBe("40px");
		await expect(style.height).toBe("40px");
		// Flisa er dekorativ. Den skal ikke legge støy i tilgjengelighetstreet,
		// og skal ikke kunne fokuseres.
		await expect(canvas.queryByRole("img")).toBeNull();
		await expect((tile as HTMLElement).querySelector("svg")).toHaveAttribute("aria-hidden", "true");
	},
};

export const Variants: Story = {
	render: (args) => (
		<div className="flex items-center gap-4">
			<IconContainer {...args} variant="soft" />
			<IconContainer {...args} variant="solid" />
			<IconContainer {...args} variant="outline" />
		</div>
	),
	play: async ({ canvasElement }) => {
		const [soft, solid, outline] = [...canvasElement.querySelectorAll("span")].map((tile) =>
			getComputedStyle(tile),
		);
		// Hårstreken på outline er en ekte border, ikke en inset ring. Da teller
		// den i layout, og de tre variantene står på nøyaktig samme bredde.
		await expect(outline.borderTopWidth).toBe("1px");
		await expect(soft.borderTopWidth).toBe("0px");
		await expect([soft.width, solid.width, outline.width]).toEqual(["40px", "40px", "40px"]);
		// Fylt flate skal være merkbart mørkere enn den tonede.
		await expect(solid.backgroundColor).not.toBe(soft.backgroundColor);
	},
};

export const Tones: Story = {
	parameters: { layout: "padded" },
	render: (args) => (
		<div className="flex flex-col gap-4">
			{(["soft", "solid", "outline"] as const).map((variant) => (
				<div className="flex items-center gap-4" key={variant}>
					<IconContainer {...args} icon="Sparkles" tone="brand" variant={variant} />
					<IconContainer {...args} icon="Circle" tone="neutral" variant={variant} />
					<IconContainer {...args} icon="Check" tone="success" variant={variant} />
					<IconContainer {...args} icon="TriangleAlert" tone="warning" variant={variant} />
					<IconContainer {...args} icon="X" tone="error" variant={variant} />
					<IconContainer {...args} icon="Info" tone="info" variant={variant} />
				</div>
			))}
		</div>
	),
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex items-center gap-4">
			<IconContainer {...args} size="sm" />
			<IconContainer {...args} size="md" />
			<IconContainer {...args} size="lg" />
			<IconContainer {...args} size="xl" />
		</div>
	),
	play: async ({ canvasElement }) => {
		const tiles = [...canvasElement.querySelectorAll("span")];
		await expect(tiles.map((tile) => getComputedStyle(tile).width)).toEqual([
			"32px",
			"40px",
			"48px",
			"56px",
		]);
		// Ikonet skal vokse med flisa, ellers driver den optiske vekta.
		await expect(
			tiles.map((tile) => getComputedStyle(tile.querySelector("svg") as SVGElement).width),
		).toEqual(["16px", "20px", "24px", "28px"]);
	},
};

export const Circle: Story = {
	args: { shape: "circle" },
	render: (args) => (
		<div className="flex items-center gap-4">
			<IconContainer {...args} size="sm" />
			<IconContainer {...args} size="md" />
			<IconContainer {...args} size="lg" />
			<IconContainer {...args} size="xl" />
		</div>
	),
	play: async ({ canvasElement }) => {
		// `shape` skal slå radiusen fra `size`, ellers får sm en 8-pikslers
		// avrunding og resten en sirkel.
		await expect(
			[...canvasElement.querySelectorAll("span")].map(
				(tile) => getComputedStyle(tile).borderRadius,
			),
		).toEqual(["9999px", "9999px", "9999px", "9999px"]);
	},
};

export const InAList: Story = {
	parameters: { layout: "padded" },
	render: (args) => (
		<ul className="flex max-w-[420px] flex-col gap-4">
			<li className="flex items-center gap-3">
				<IconContainer {...args} icon="ShieldCheck" tone="success" />
				<span className="text-body text-text-strong">Serverrendret som standard</span>
			</li>
			<li className="flex items-center gap-3">
				<IconContainer {...args} icon="Palette" tone="brand" />
				<span className="text-body text-text-strong">Tokens som snur i mørkt tema</span>
			</li>
		</ul>
	),
};
