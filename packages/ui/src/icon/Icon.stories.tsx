import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Icon } from "./Icon.tsx";

/**
 * Practical UI er bygget på Feather-ikonene. Lucide er det vedlikeholdte
 * supersettet med samme navn og geometri, og `IconName` er utledet derfra - en
 * skrivefeil i `name` blir en typefeil, ikke et tomt hull i grensesnittet.
 *
 * Ikoner er dekorative og skjult for skjermlesere som standard. Bærer ikonet
 * mening ingen nærliggende tekst dekker, gi det `label`.
 */
const meta: Meta<typeof Icon> = {
	title: "Components/Icon",
	component: Icon,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { name: "Bell" },
	argTypes: {
		name: { control: "text" },
		size: { control: { type: "number", min: 12, max: 48, step: 4 } },
		strokeWidth: { control: { type: "number", min: 1, max: 3, step: 0.25 } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement }) => {
		const svg = canvasElement.querySelector("svg");
		// Dekorativ som standard: skjult for skjermlesere, uten rolle og navn.
		await expect(svg).toHaveAttribute("aria-hidden", "true");
		await expect(svg).not.toHaveAttribute("role");
	},
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex items-center gap-6 text-icon-strong">
			{[16, 20, 24, 32].map((s) => (
				<div key={s} className="flex flex-col items-center gap-2">
					<Icon {...args} size={s} />
					<code className="font-mono text-tiny text-text-weak">{s}</code>
				</div>
			))}
		</div>
	),
};

export const IconRoles: Story = {
	render: (args) => (
		<div className="flex items-center gap-6">
			{[
				["text-icon-strong", "strong"],
				["text-icon-neutral", "neutral"],
				["text-icon-brand", "brand"],
				["text-icon-success", "success"],
				["text-icon-warning", "warning"],
				["text-icon-error", "error"],
			].map(([className, name]) => (
				<div key={name} className={`flex flex-col items-center gap-2 ${className}`}>
					<Icon {...args} size={24} />
					<code className="font-mono text-tiny text-text-weak">{name}</code>
				</div>
			))}
		</div>
	),
};

export const StrokeWidth: Story = {
	render: (args) => (
		<div className="flex items-center gap-6 text-icon-strong">
			{[1.5, 2, 2.5].map((t) => (
				<div key={t} className="flex flex-col items-center gap-2">
					<Icon {...args} size={32} strokeWidth={t} />
					<code className="font-mono text-tiny text-text-weak">{t}</code>
				</div>
			))}
		</div>
	),
};

/**
 * Med `label` blir ikonet `role="img"` med et tilgjengelig navn. Bruk det bare
 * når ingen tekst i nærheten forklarer hva ikonet betyr - ellers leses
 * meningen opp to ganger.
 */
export const WithTextAlternative: Story = {
	args: { name: "TriangleAlert", label: "Advarsel", size: 24 },
	play: async ({ canvas }) => {
		const icon = canvas.getByRole("img", { name: "Advarsel" });
		await expect(icon).toBeVisible();
		await expect(icon).not.toHaveAttribute("aria-hidden");
	},
};

/**
 * Ikonet arver `currentColor`, så det følger tekstfargen der det står. Derfor
 * trenger et ikon ved siden av tekst sjelden en egen fargeklasse.
 */
export const InheritsTextColor: Story = {
	render: (args) => (
		<p className="flex items-center gap-2 text-body text-text-error">
			<Icon {...args} name="CircleAlert" size={20} />
			Ordren ble avvist
		</p>
	),
	play: async ({ canvas, canvasElement }) => {
		const svg = canvasElement.querySelector("svg");
		const paragraph = canvas.getByText(/Ordren ble avvist/);
		await expect(getComputedStyle(svg as Element).color).toBe(getComputedStyle(paragraph).color);
	},
};
