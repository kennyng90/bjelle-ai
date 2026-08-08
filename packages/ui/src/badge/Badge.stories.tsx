import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Badge, type BadgeColor } from "./Badge.tsx";

const tones: { color: BadgeColor; text: string }[] = [
	{ color: "neutral", text: "Utkast" },
	{ color: "brand", text: "Ny" },
	{ color: "success", text: "Aktiv" },
	{ color: "warning", text: "Utløper snart" },
	{ color: "error", text: "Avvist" },
	{ color: "info", text: "Til vurdering" },
];

const meta: Meta<typeof Badge> = {
	title: "Components/Badge",
	component: Badge,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { children: "Aktiv" },
	argTypes: {
		color: {
			control: "inline-radio",
			options: ["neutral", "brand", "success", "warning", "error", "info"],
		},
		size: { control: "inline-radio", options: ["sm", "md", "lg"] },
		icon: { control: false },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		// Vaktpost, ikke en test av merkelappen: fanger at Tailwind har falt ut av
		// testoppsettet. Uten stiler består enhver kontrastsjekk trivielt.
		const background = getComputedStyle(canvas.getByText("Aktiv")).backgroundColor;
		await expect(background).not.toBe("rgba(0, 0, 0, 0)");
	},
};

/**
 * Alle seks toner. Axe måler kontrasten på hver enkelt her - de tonale fyllene
 * er svake, og `warning` ligger lavest av dem i lyst tema.
 */
export const Tones: Story = {
	render: (args) => (
		<div className="flex flex-wrap items-center gap-2">
			{tones.map(({ color, text }) => (
				<Badge {...args} color={color} key={color}>
					{text}
				</Badge>
			))}
		</div>
	),
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex items-center gap-2">
			<Badge {...args} size="sm" />
			<Badge {...args} size="md" />
			<Badge {...args} size="lg" />
		</div>
	),
};

export const WithDot: Story = {
	args: { dot: true },
	render: (args) => (
		<div className="flex flex-wrap items-center gap-2">
			{tones.map(({ color, text }) => (
				<Badge {...args} color={color} key={color}>
					{text}
				</Badge>
			))}
		</div>
	),
};

export const WithIcon: Story = {
	args: { icon: "Check", color: "success", children: "Bekreftet" },
};

/**
 * Samme matrise i mørkt tema. Egen story fordi axe kun kjører på det temaet
 * storyen faktisk rendres i - lyst tema alene ville latt halve palettet være
 * uprøvd.
 */
export const DarkTheme: Story = {
	globals: { theme: "dark" },
	args: { dot: true },
	render: (args) => (
		<div className="flex flex-wrap items-center gap-2">
			{tones.map(({ color, text }) => (
				<Badge {...args} color={color} key={color}>
					{text}
				</Badge>
			))}
		</div>
	),
};
