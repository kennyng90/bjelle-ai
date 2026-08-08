import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Text } from "./Text.tsx";

const meta: Meta<typeof Text> = {
	title: "Components/Text",
	component: Text,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { children: "Et rent og profesjonelt komponentsystem." },
	argTypes: {
		size: { control: "inline-radio", options: ["lead", "body", "small", "tiny"] },
		tone: {
			control: "select",
			options: [
				"strong",
				"weak",
				"brand",
				"error",
				"success",
				"warning",
				"info",
				"on-strong",
				"inverse-strong",
				"inverse-weak",
			],
		},
		weight: {
			control: "inline-radio",
			options: ["regular", "medium", "strong", "bold"],
		},
		as: {
			control: "select",
			options: ["p", "span", "div", "strong", "em", "li", "dd", "dt", "figcaption"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const paragraph = canvas.getByText("Et rent og profesjonelt komponentsystem.");
		const style = getComputedStyle(paragraph);
		// Vaktpost: uten Tailwind er alt 16px av seg selv, men da er også
		// linjehøyden nettleserens egen og fargen svart.
		await expect(paragraph.tagName).toBe("P");
		await expect(style.fontSize).toBe("16px");
		await expect(style.lineHeight).toBe("24px");
		await expect(style.fontWeight).toBe("400");
	},
};

export const Sizes: Story = {
	parameters: { layout: "padded" },
	render: (args) => (
		<div className="flex flex-col gap-4">
			<Text {...args} size="lead">
				Lead, 20 piksler
			</Text>
			<Text {...args} size="body">
				Body, 16 piksler
			</Text>
			<Text {...args} size="small">
				Small, 14 piksler
			</Text>
			<Text {...args} size="tiny">
				Tiny, 13 piksler
			</Text>
		</div>
	),
	play: async ({ canvas }) => {
		// Practical UI hardkodet 13 og 20 piksler utenom sin egen ramp. Her er
		// begge tokens, og disse to fanger at de faktisk er koblet på.
		await expect(getComputedStyle(canvas.getByText("Tiny, 13 piksler")).fontSize).toBe("13px");
		await expect(getComputedStyle(canvas.getByText("Lead, 20 piksler")).fontSize).toBe("20px");
	},
};

export const Tones: Story = {
	parameters: { layout: "padded" },
	render: (args) => (
		<div className="flex flex-col gap-3">
			<Text {...args} tone="strong">
				Sterk - brødtekst
			</Text>
			<Text {...args} tone="weak">
				Svak - støttetekst
			</Text>
			<Text {...args} tone="brand">
				Merkevare
			</Text>
			<Text {...args} tone="error">
				Feil - noe gikk galt
			</Text>
			<Text {...args} tone="success">
				Vellykket - endringen er lagret
			</Text>
			<Text {...args} tone="warning">
				Advarsel - dette kan ikke angres
			</Text>
			<Text {...args} tone="info">
				Informasjon - dette er nytt
			</Text>
		</div>
	),
};

export const TonesOnDarkSurface: Story = {
	parameters: { layout: "padded" },
	render: (args) => (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2 rounded-12 bg-fill-brand-strong p-6">
				<Text {...args} tone="on-strong">
					På fylt merkevareflate
				</Text>
			</div>
			<div className="flex flex-col gap-2 rounded-12 bg-background-inverse p-6">
				<Text {...args} tone="inverse-strong">
					Invertert sterk
				</Text>
				<Text {...args} tone="inverse-weak">
					Invertert svak
				</Text>
			</div>
		</div>
	),
};

export const Weights: Story = {
	parameters: { layout: "padded" },
	render: (args) => (
		<div className="flex flex-col gap-3">
			<Text {...args} weight="regular">
				Regular, 400
			</Text>
			<Text {...args} weight="medium">
				Medium, 500
			</Text>
			<Text {...args} weight="strong">
				Strong, 600
			</Text>
			<Text {...args} weight="bold">
				Bold, 700
			</Text>
		</div>
	),
	play: async ({ canvas }) => {
		// `strong` er 600 i dette systemet, ikke 700. Den forveksles lett.
		await expect(getComputedStyle(canvas.getByText("Strong, 600")).fontWeight).toBe("600");
	},
};

export const OtherElement: Story = {
	parameters: { layout: "padded" },
	render: (args) => (
		<ul className="flex list-disc flex-col gap-1 pl-6">
			<Text {...args} as="li">
				Første punkt
			</Text>
			<Text {...args} as="li">
				Andre punkt
			</Text>
		</ul>
	),
	play: async ({ canvas }) => {
		// `as` finnes for at Text skal kunne brukes der `<p>` ikke er gyldig.
		const items = canvas.getAllByRole("listitem");
		await expect(items).toHaveLength(2);
		await expect(items[0].tagName).toBe("LI");
	},
};

export const Paragraph: Story = {
	parameters: { layout: "padded" },
	args: {
		children:
			"Bjelle er et komponentbibliotek bygget på designtokens. Alle komponentene rendres på server først, og alle farger kommer fra roller som snur i mørkt tema.",
	},
	render: (args) => (
		<div className="max-w-[560px]">
			<Text {...args} />
		</div>
	),
};
