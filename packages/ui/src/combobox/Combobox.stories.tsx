import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { Combobox } from "./Combobox.tsx";

const counties = [
	"Agder",
	"Innlandet",
	"Møre og Romsdal",
	"Nordland",
	"Oslo",
	"Rogaland",
	"Troms og Finnmark",
	"Trøndelag",
	"Vestfold og Telemark",
	"Vestland",
];

const meta: Meta<typeof Combobox> = {
	title: "Components/Combobox",
	component: Combobox,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
	args: {
		label: "Fylke",
		options: counties,
		placeholder: "Søk etter fylke",
		onChange: fn(),
	},
	argTypes: {
		options: { control: false },
		id: { table: { disable: true } },
		name: { table: { disable: true } },
		className: { table: { disable: true } },
	},
	// Lista er absolutt posisjonert. Uten høyde under feltet legger den seg
	// utenfor lerretet, og axe måler kontrast mot noe annet enn det brukeren ser.
	decorators: [
		(Story) => (
			<div className="w-80 pb-72">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const field = canvas.getByRole("combobox", { name: "Fylke" });
		// Vaktpost: fanger at Tailwind har falt ut av testoppsettet.
		await expect(getComputedStyle(field).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
		await expect(field).toHaveAttribute("aria-expanded", "false");
		await expect(field).toHaveAttribute("aria-autocomplete", "list");
		await expect(field).not.toHaveAttribute("aria-activedescendant");

		// Fokusringen skal stå der i det øyeblikket fokus lander. Ligger
		// outline-color i en transition (som i transition-colors), toner ringen
		// inn fra tekstfargen over 180 ms, og da ser man ingenting med en gang.
		field.focus();
		const ring = getComputedStyle(field);
		await expect(ring.outlineWidth).toBe("2px");
		await expect(ring.outlineColor).toBe("rgb(76, 100, 217)");
	},
};

export const WithSelectedValue: Story = {
	args: { defaultValue: "Oslo", supportingText: "Vi bruker fylket til å finne nærmeste kontor." },
	play: async ({ canvas }) => {
		const field = canvas.getByRole("combobox", { name: "Fylke" });
		await expect(field).toHaveValue("Oslo");
		// Hjelpeteksten må nå fram til skjermleseren, ikke bare til øyet.
		const help = canvas.getByText("Vi bruker fylket til å finne nærmeste kontor.");
		await expect(field).toHaveAttribute("aria-describedby", expect.stringContaining(help.id));
	},
};

export const OpensWithArrowKey: Story = {
	play: async ({ canvas }) => {
		const field = canvas.getByRole("combobox", { name: "Fylke" });
		field.focus();
		await expect(field).toHaveAttribute("aria-expanded", "false");

		await userEvent.keyboard("{ArrowDown}");
		await expect(field).toHaveAttribute("aria-expanded", "true");

		const list = canvas.getByRole("listbox");
		await expect(list).toBeVisible();
		await expect(field).toHaveAttribute("aria-controls", list.id);

		// Uthevingen flytter seg uten at DOM-fokus forlater inputen.
		const options = canvas.getAllByRole("option");
		await expect(field).toHaveAttribute("aria-activedescendant", options[0].id);
		await expect(options[0]).toHaveAttribute("aria-selected", "true");
		await expect(document.activeElement).toBe(field);

		await userEvent.keyboard("{ArrowDown}");
		await expect(field).toHaveAttribute("aria-activedescendant", options[1].id);
		await expect(options[0]).toHaveAttribute("aria-selected", "false");

		await userEvent.keyboard("{ArrowUp}{ArrowUp}");
		await expect(field).toHaveAttribute("aria-activedescendant", options[options.length - 1].id);
	},
};

export const SelectsWithEnter: Story = {
	play: async ({ canvas, args }) => {
		const field = canvas.getByRole("combobox", { name: "Fylke" });
		field.focus();
		await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");

		await waitFor(() => expect(args.onChange).toHaveBeenCalledWith("Innlandet"));
		await expect(field).toHaveValue("Innlandet");
		await expect(field).toHaveAttribute("aria-expanded", "false");
		await expect(canvas.queryByRole("listbox")).toBeNull();
		await expect(document.activeElement).toBe(field);
	},
};

export const EscapeDismisses: Story = {
	args: { defaultValue: "Oslo" },
	play: async ({ canvas }) => {
		const field = canvas.getByRole<HTMLInputElement>("combobox", { name: "Fylke" });
		field.focus();
		// Fokus markerer hele verdien, så det brukeren skriver erstatter den i
		// stedet for å bli limt bak "Oslo".
		await expect(field.selectionStart).toBe(0);
		await expect(field.selectionEnd).toBe(4);

		await userEvent.clear(field);
		await userEvent.keyboard("nord");
		await expect(field).toHaveValue("nord");
		await expect(field).toHaveAttribute("aria-expanded", "true");

		await userEvent.keyboard("{Escape}");
		await expect(field).toHaveAttribute("aria-expanded", "false");
		// Escape forkaster søket og setter feltet tilbake til valgt verdi.
		await expect(field).toHaveValue("Oslo");
		await expect(document.activeElement).toBe(field);
	},
};

export const Filtering: Story = {
	play: async ({ canvas }) => {
		const field = canvas.getByRole("combobox", { name: "Fylke" });
		await userEvent.click(field);
		await userEvent.keyboard("vest");

		await waitFor(async () => {
			await expect(canvas.getAllByRole("option")).toHaveLength(2);
		});
		// Antall treff må annonseres - lista er ikke synlig for en skjermleser
		// som ikke flytter fokus dit.
		await expect(canvas.getByRole("status")).toHaveTextContent("2 treff");
	},
};

export const NoResults: Story = {
	play: async ({ canvas }) => {
		const field = canvas.getByRole("combobox", { name: "Fylke" });
		await userEvent.click(field);
		await userEvent.keyboard("zzz");

		await waitFor(async () => {
			await expect(canvas.getByRole("status")).toHaveTextContent("Ingen treff");
		});
		await expect(canvas.queryByRole("listbox")).toBeNull();
		await expect(field).not.toHaveAttribute("aria-activedescendant");
	},
};

export const SelectsWithMouse: Story = {
	play: async ({ canvas, args }) => {
		const field = canvas.getByRole("combobox", { name: "Fylke" });
		await userEvent.click(field);
		const option = canvas.getByRole("option", { name: "Rogaland" });

		// En ekte mus flytter fokus bort fra feltet ved mousedown, og da lukkes
		// lista før klikket lander. user-event sender syntetiske hendelser og
		// blurrer ikke, så mekanismen må sjekkes direkte: dispatchEvent gir false
		// når noen har avlyst standardoppførselen.
		const canMoveFocus = option.dispatchEvent(
			new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
		);
		await expect(canMoveFocus).toBe(false);

		await userEvent.click(option);
		await waitFor(() => expect(args.onChange).toHaveBeenCalledWith("Rogaland"));
		await expect(field).toHaveValue("Rogaland");
		await expect(field).toHaveAttribute("aria-expanded", "false");
	},
};

export const WithError: Story = {
	args: { error: "Velg et fylke før du går videre." },
	play: async ({ canvas }) => {
		const field = canvas.getByRole("combobox", { name: "Fylke" });
		await expect(field).toHaveAttribute("aria-invalid", "true");
		const error = canvas.getByRole("alert");
		await expect(field).toHaveAttribute("aria-describedby", expect.stringContaining(error.id));
	},
};

export const Disabled: Story = {
	args: { disabled: true, defaultValue: "Agder" },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("combobox", { name: "Fylke" })).toBeDisabled();
	},
};

export const WithObjectOptions: Story = {
	args: {
		label: "Ansvarlig",
		placeholder: "Søk etter person",
		options: [
			{ value: "ah", label: "Anniken Haugen" },
			{ value: "bs", label: "Bjørn Sæther" },
			{ value: "ck", label: "Camilla Kvam" },
		],
		defaultValue: "bs",
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("combobox", { name: "Ansvarlig" })).toHaveValue("Bjørn Sæther");
	},
};
