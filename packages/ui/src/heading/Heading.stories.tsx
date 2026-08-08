import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Heading } from "./Heading.tsx";

const meta: Meta<typeof Heading> = {
	title: "Components/Heading",
	component: Heading,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { children: "Bygg grensesnitt raskere" },
	argTypes: {
		level: {
			control: "inline-radio",
			options: ["display", "h1", "h2", "h3", "h4"],
		},
		as: {
			control: "select",
			options: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "div"],
		},
		tone: {
			control: "inline-radio",
			options: ["strong", "weak", "brand", "on-strong", "inverse-strong"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const heading = canvas.getByRole("heading", { level: 2 });
		const style = getComputedStyle(heading);
		// Vaktpost: uten Tailwind faller rampen ut og alt blir 16px.
		await expect(style.fontSize).toBe("32px");
		await expect(style.lineHeight).toBe("40px");
		// Rampen setter sperringen. Setter komponenten den selv i tillegg,
		// eller mangler tokenet, ryker denne.
		await expect(style.letterSpacing).toBe("-0.64px");
	},
};

export const Levels: Story = {
	parameters: { layout: "padded" },
	render: (args) => (
		<div className="flex flex-col gap-6">
			<Heading {...args} level="display">
				Display, 56 piksler
			</Heading>
			<Heading {...args} level="h1">
				Overskrift 1, 40 piksler
			</Heading>
			<Heading {...args} level="h2">
				Overskrift 2, 32 piksler
			</Heading>
			<Heading {...args} level="h3">
				Overskrift 3, 24 piksler
			</Heading>
			<Heading {...args} level="h4">
				Overskrift 4, 20 piksler
			</Heading>
		</div>
	),
	play: async ({ canvas }) => {
		// Standardtaggen følger nivået, slik at et dokument skrevet uten `as`
		// får et gyldig hierarki av seg selv.
		await expect(canvas.getByText("Overskrift 3, 24 piksler").tagName).toBe("H3");
		await expect(getComputedStyle(canvas.getByText("Display, 56 piksler")).fontSize).toBe("56px");
	},
};

export const VisualLevelVsSemantics: Story = {
	args: { level: "display", as: "h2" },
	play: async ({ canvas }) => {
		// `level` styrer utseendet, `as` styrer taggen. Uten skillet må en side
		// enten hoppe i overskriftsnivå eller nøye seg med feil størrelse.
		const heading = canvas.getByRole("heading", { level: 2 });
		await expect(heading.tagName).toBe("H2");
		await expect(getComputedStyle(heading).fontSize).toBe("56px");
	},
};

export const Tones: Story = {
	parameters: { layout: "padded" },
	render: (args) => (
		<div className="flex flex-col gap-6">
			<Heading {...args} level="h3" tone="strong">
				Sterk
			</Heading>
			<Heading {...args} level="h3" tone="weak">
				Svak
			</Heading>
			<Heading {...args} level="h3" tone="brand">
				Merkevare
			</Heading>
			<div className="rounded-12 bg-fill-brand-strong p-6">
				<Heading {...args} level="h3" tone="on-strong">
					På fylt flate
				</Heading>
			</div>
			<div className="rounded-12 bg-background-inverse p-6">
				<Heading {...args} level="h3" tone="inverse-strong">
					På invertert flate
				</Heading>
			</div>
		</div>
	),
};

export const LongHeading: Story = {
	parameters: { layout: "padded" },
	args: {
		level: "h1",
		children:
			"En overskrift som er lang nok til å brekke over flere linjer, og som derfor skal balanseres",
	},
	render: (args) => (
		<div className="max-w-[640px]">
			<Heading {...args} />
		</div>
	),
	play: async ({ canvas }) => {
		// Practical UI balanserer overskrifter. Faller `text-balance` ut, får
		// siste linje ett enslig ord.
		await expect(getComputedStyle(canvas.getByRole("heading")).textWrap).toBe("balance");
	},
};
