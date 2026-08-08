import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Card } from "../card/Card.tsx";
import { SummaryList } from "./SummaryList.tsx";

const order = [
	{ label: "Delsum", value: "1 200,00 kr" },
	{ label: "Frakt", value: "79,00 kr" },
	{ label: "Mva. (25 %)", value: "319,75 kr" },
	{ label: "Totalt", value: "1 598,75 kr" },
];

const meta: Meta<typeof SummaryList> = {
	title: "Components/SummaryList",
	component: SummaryList,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { items: order, className: "w-96" },
	argTypes: {
		// Arvet fra HTMLAttributes. Ikke noe designeren skal skru på.
		role: { table: { disable: true } },
		tabIndex: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas, canvasElement }) => {
		// Nøkkel/verdi er en beskrivelsesliste, ikke rader av div-er.
		const list = canvasElement.querySelector("dl");
		await expect(list).not.toBeNull();
		await expect(canvas.getAllByRole("term")).toHaveLength(4);
		await expect(canvas.getAllByRole("definition")).toHaveLength(4);
		// Vaktpost: uten Tailwind er det ingen skillelinje mellom radene.
		const secondRow = canvas.getByText("Frakt").parentElement;
		if (!secondRow) throw new Error("Fant ikke raden");
		await expect(getComputedStyle(secondRow).borderBottomWidth).toBe("1px");
	},
};

export const InCard: Story = {
	render: (args) => (
		<Card className="w-96">
			<h3 className="text-h4 font-strong text-text-strong">Ordresammendrag</h3>
			<SummaryList {...args} className="mt-2" />
		</Card>
	),
};

export const LongValues: Story = {
	args: {
		items: [
			{ label: "Leveringsadresse", value: "Storgata 1, 0155 Oslo" },
			{ label: "Kontaktperson", value: "Ingrid Hovden Bjelland" },
			{
				label: "Merknad",
				value: "Pakken settes igjen på verandaen dersom ingen er hjemme mellom 08 og 16.",
			},
		],
	},
};

export const Empty: Story = {
	name: "Empty list",
	args: { items: [], emptyState: "Ingen opplysninger er registrert ennå." },
	play: async ({ canvas }) => {
		await expect(canvas.getByText("Ingen opplysninger er registrert ennå.")).toBeVisible();
	},
};
