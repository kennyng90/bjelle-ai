import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Card } from "../card/Card.tsx";
import { MetricItem } from "./MetricItem.tsx";

const meta: Meta<typeof MetricItem> = {
	title: "Components/MetricItem",
	component: MetricItem,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: {
		label: "Omsetning",
		value: "23,8 mill.",
		delta: "+12 %",
		trend: "up",
		caption: "Mot forrige måned",
	},
	argTypes: {
		trend: { control: "inline-radio", options: ["up", "down", "flat"] },
		// Arvet fra HTMLAttributes. Ikke noe designeren skal skru på.
		role: { table: { disable: true } },
		tabIndex: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Increase: Story = {
	play: async ({ canvas, canvasElement }) => {
		const value = canvas.getByText("23,8 mill.");
		// Vaktpost: uten Tailwind i testoppsettet er tallet like stort som etiketten.
		await expect(getComputedStyle(value).fontSize).toBe("32px");
		// Retningen skal ikke bæres av farge alene: fortegn i teksten, ikon i tillegg,
		// og en retningsangivelse for skjermlesere.
		await expect(canvas.getByText("+12 %")).toBeVisible();
		await expect(canvas.getByText("Oppgang")).toBeInTheDocument();
		await expect(canvasElement.querySelector("svg")).not.toBeNull();
	},
};

export const Decrease: Story = {
	args: { label: "Frafall", value: "1,2 %", delta: "-0,4 %", trend: "down" },
	play: async ({ canvas }) => {
		await expect(canvas.getByText("-0,4 %")).toBeVisible();
		await expect(canvas.getByText("Nedgang")).toBeInTheDocument();
	},
};

export const Unchanged: Story = {
	args: { label: "Aktive brukere", value: "8 402", delta: "0 %", trend: "flat" },
	play: async ({ canvas }) => {
		await expect(canvas.getByText("Uendret")).toBeInTheDocument();
	},
};

export const WithoutChange: Story = {
	args: { delta: undefined, trend: undefined, caption: undefined },
	play: async ({ canvasElement }) => {
		await expect(canvasElement.querySelector("svg")).toBeNull();
	},
};

export const InCard: Story = {
	parameters: { layout: "padded" },
	render: () => (
		<div className="grid gap-4 rounded-20 bg-background-sunken p-8 sm:grid-cols-3">
			<Card>
				<MetricItem
					caption="Mot forrige måned"
					delta="+12 %"
					label="Omsetning"
					trend="up"
					value="23,8 mill."
				/>
			</Card>
			<Card>
				<MetricItem
					caption="Mot forrige måned"
					delta="-0,4 %"
					label="Frafall"
					trend="down"
					value="1,2 %"
				/>
			</Card>
			<Card>
				<MetricItem
					caption="Mot forrige måned"
					delta="+3 %"
					label="Økter"
					trend="up"
					value="8 402"
				/>
			</Card>
		</div>
	),
};
