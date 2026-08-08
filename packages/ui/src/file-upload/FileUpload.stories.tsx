import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { FileUpload } from "./FileUpload.tsx";

function makeFile(name: string, bytes: number, type: string) {
	return new File(["a".repeat(bytes)], name, { type });
}

/**
 * `fireEvent.drop` kan ikke brukes her. Testing Library bygger om dataTransfer
 * til en ny, tom `DataTransfer` fordi den kopierer egne egenskaper fra objektet
 * - og en ekte DataTransfer har alt på prototypen. Det er en jsdom-workaround
 * som stille gir null filer i en ekte nettleser. Vi lager DragEvent-en selv.
 */
function drop(zone: Element, ...files: File[]) {
	const data = new DataTransfer();
	for (const file of files) data.items.add(file);
	zone.dispatchEvent(
		new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: data }),
	);
}

const meta: Meta<typeof FileUpload> = {
	title: "Components/FileUpload",
	component: FileUpload,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
	args: {
		label: "Vedlegg",
		hint: "SVG, PNG, JPG eller PDF, maks. 10 MB",
		multiple: true,
		onChange: fn(),
	},
	argTypes: {
		files: { control: false },
		defaultFiles: { control: false },
		id: { table: { disable: true } },
		name: { table: { disable: true } },
		className: { table: { disable: true } },
	},
	decorators: [
		(Story) => (
			<div className="w-[28rem]">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
	play: async ({ canvas }) => {
		const field = canvas.getByLabelText("Vedlegg");
		// Slippsonen må ha en ekte filinput bak seg, ikke bare en div med onDrop.
		await expect(field).toHaveProperty("type", "file");
		await expect(getComputedStyle(canvas.getByText("Vedlegg")).color).not.toBe("rgb(0, 0, 0)");
		await expect(canvas.getByRole("list", { name: "Valgte filer" }).children).toHaveLength(0);
	},
};

export const ReachableWithKeyboard: Story = {
	play: async ({ canvas }) => {
		const field = canvas.getByLabelText("Vedlegg");
		await userEvent.tab();
		await expect(field).toHaveFocus();
		// Hjelpeteksten og oppfordringen skal følge med som beskrivelse.
		await expect(field).toHaveAccessibleDescription(
			expect.stringContaining("SVG, PNG, JPG eller PDF, maks. 10 MB"),
		);

		// Inputen er sr-only. Ringen må tegnes på slippsonen, ellers ser ingen
		// hvor tastaturfokus står.
		// Fokusringen skal stå der i det øyeblikket fokus lander. Ligger
		// outline-color i en transition (som i transition-colors), toner ringen
		// inn fra tekstfargen over 180 ms, og da ser man ingenting med en gang.
		const zone = field.closest("label");
		if (!zone) throw new Error("Fant ingen slippsone");
		const ring = getComputedStyle(zone);
		await expect(ring.outlineWidth).toBe("2px");
		await expect(ring.outlineColor).toBe("rgb(76, 100, 217)");
	},
};

export const UploadingFile: Story = {
	play: async ({ canvas, args }) => {
		const field = canvas.getByLabelText<HTMLInputElement>("Vedlegg");
		await userEvent.upload(field, makeFile("rapport.pdf", 2400, "application/pdf"));

		await waitFor(async () => {
			await expect(canvas.getByRole("listitem")).toHaveTextContent("rapport.pdf");
		});
		await expect(canvas.getByText("2,4 kB")).toBeVisible();
		await expect(args.onChange).toHaveBeenCalled();
		await expect(canvas.getByRole("status")).toHaveTextContent("rapport.pdf er lagt til");
	},
};

export const DropsFile: Story = {
	play: async ({ canvas, args }) => {
		const zone = canvas.getByLabelText("Vedlegg").closest("label");
		if (!zone) throw new Error("Fant ingen slippsone");

		drop(zone, makeFile("skisse.png", 1200, "image/png"));

		await waitFor(async () => {
			await expect(canvas.getByRole("listitem")).toHaveTextContent("skisse.png");
		});
		await expect(args.onChange).toHaveBeenCalled();
	},
};

export const WithFiles: Story = {
	args: {
		files: [
			makeFile("aarsrapport-2025.pdf", 2_400_000, "application/pdf"),
			makeFile("organisasjonskart.png", 84_000, "image/png"),
		],
	},
	play: async ({ canvas }) => {
		const rows = canvas.getAllByRole("listitem");
		await expect(rows).toHaveLength(2);
		// Hver fjern-knapp må si hvilken fil den fjerner. "Fjern" alene er ubrukelig
		// når skjermleseren lister opp knappene ut av kontekst.
		await expect(canvas.getByRole("button", { name: "Fjern aarsrapport-2025.pdf" })).toBeVisible();
		await expect(canvas.getByRole("button", { name: "Fjern organisasjonskart.png" })).toBeVisible();
		await expect(canvas.getByText("2,4 MB")).toBeVisible();
	},
};

export const RemovesFile: Story = {
	args: {
		defaultFiles: [
			makeFile("aarsrapport-2025.pdf", 2_400_000, "application/pdf"),
			makeFile("organisasjonskart.png", 84_000, "image/png"),
		],
	},
	play: async ({ canvas, args }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Fjern aarsrapport-2025.pdf" }));

		await waitFor(async () => {
			await expect(canvas.getAllByRole("listitem")).toHaveLength(1);
		});
		await expect(args.onChange).toHaveBeenCalledWith([
			expect.objectContaining({ name: "organisasjonskart.png" }),
		]);
		await expect(canvas.getByRole("status")).toHaveTextContent("aarsrapport-2025.pdf er fjernet");
	},
};

export const FileTooLarge: Story = {
	args: { maxSize: 1_000_000, hint: "PDF, maks. 1 MB" },
	play: async ({ canvas, args }) => {
		const field = canvas.getByLabelText<HTMLInputElement>("Vedlegg");
		await userEvent.upload(field, makeFile("stor.pdf", 1_400_000, "application/pdf"));

		await waitFor(async () => {
			await expect(canvas.getByRole("alert")).toHaveTextContent("stor.pdf er større enn 1,0 MB");
		});
		await expect(canvas.queryAllByRole("listitem")).toHaveLength(0);
		await expect(args.onChange).not.toHaveBeenCalled();
	},
};

export const WrongFileType: Story = {
	args: { accept: ".pdf", hint: "Kun PDF" },
	play: async ({ canvas }) => {
		const zone = canvas.getByLabelText("Vedlegg").closest("label");
		if (!zone) throw new Error("Fant ingen slippsone");

		// Nettleseren håndhever accept i filvelgeren, men ikke ved slipp.
		drop(zone, makeFile("skisse.png", 1200, "image/png"));

		await waitFor(async () => {
			await expect(canvas.getByRole("alert")).toHaveTextContent(
				"skisse.png har et filformat vi ikke tar imot",
			);
		});
	},
};

export const WithError: Story = {
	args: { error: "Opplastingen feilet. Prøv igjen." },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("alert")).toHaveTextContent("Opplastingen feilet. Prøv igjen.");
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		defaultFiles: [makeFile("aarsrapport-2025.pdf", 2_400_000, "application/pdf")],
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByLabelText("Vedlegg")).toBeDisabled();
		await expect(canvas.getByRole("button", { name: "Fjern aarsrapport-2025.pdf" })).toBeDisabled();
	},
};

export const SingleFile: Story = {
	args: { multiple: false, label: "Profilbilde", hint: "PNG eller JPG, maks. 2 MB" },
	play: async ({ canvas }) => {
		await expect(canvas.getByLabelText("Profilbilde")).not.toHaveAttribute("multiple");
	},
};
