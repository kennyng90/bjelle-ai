import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { DatePicker } from "./DatePicker.tsx";

// 12. februar 2026 er en torsdag. Alle tastaturtestene under regner ut fra det,
// så kalenderen må stå på en fast måned - ikke på dagens dato.
const startDate = new Date(2026, 1, 12);

const meta: Meta<typeof DatePicker> = {
	title: "Components/DatePicker",
	component: DatePicker,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: {
		label: "Oppstartsdato",
		defaultValue: startDate,
		onChange: fn(),
	},
	argTypes: {
		value: { control: false },
		defaultValue: { control: false },
		min: { control: false },
		max: { control: false },
		id: { table: { disable: true } },
		className: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const grid = canvas.getByRole("grid");
		// Vaktpost: fanger at Tailwind har falt ut av testoppsettet.
		await expect(
			getComputedStyle(canvas.getByRole("button", { name: "Forrige måned" })).borderRadius,
		).not.toBe("0px");

		await expect(canvas.getByText("Februar 2026")).toBeVisible();
		await expect(grid).toHaveAccessibleName(expect.stringContaining("Februar 2026"));

		// Ekte tabellsemantikk: sju kolonneoverskrifter, mandag først.
		const columns = canvas.getAllByRole("columnheader");
		await expect(columns).toHaveLength(7);
		await expect(columns[0]).toHaveTextContent("ma");
		await expect(columns[6]).toHaveTextContent("sø");
	},
};

export const WithSelectedDate: Story = {
	play: async ({ canvas }) => {
		const selected = canvas.getByRole("button", { name: "12. februar 2026" });
		await expect(selected.closest("td")).toHaveAttribute("aria-selected", "true");
		// Roving tabindex: bare én dag ligger i tabrekkefølgen.
		await expect(selected).toHaveAttribute("tabindex", "0");
		await expect(canvas.getByRole("button", { name: "13. februar 2026" })).toHaveAttribute(
			"tabindex",
			"-1",
		);
		const tabbable = canvas
			.getAllByRole("gridcell")
			.flatMap((cell) => Array.from(cell.querySelectorAll('[tabindex="0"]')));
		await expect(tabbable).toHaveLength(1);

		// Fokusringen skal stå der i det øyeblikket fokus lander. Ligger
		// outline-color i en transition (som i transition-colors), toner ringen
		// inn fra tekstfargen over 180 ms, og da ser man ingenting med en gang.
		selected.focus();
		const ring = getComputedStyle(selected);
		await expect(ring.outlineWidth).toBe("2px");
		await expect(ring.outlineColor).toBe("rgb(76, 100, 217)");
	},
};

export const ArrowKeysMoveDayByDay: Story = {
	play: async ({ canvas }) => {
		const start = canvas.getByRole("button", { name: "12. februar 2026" });
		start.focus();

		await userEvent.keyboard("{ArrowRight}");
		await waitFor(async () => {
			await expect(canvas.getByRole("button", { name: "13. februar 2026" })).toHaveFocus();
		});
		// Tabrekkefølgen følger fokus, ellers hopper Tab tilbake til gammel dag.
		await expect(canvas.getByRole("button", { name: "13. februar 2026" })).toHaveAttribute(
			"tabindex",
			"0",
		);
		await expect(start).toHaveAttribute("tabindex", "-1");

		await userEvent.keyboard("{ArrowDown}");
		await waitFor(async () => {
			await expect(canvas.getByRole("button", { name: "20. februar 2026" })).toHaveFocus();
		});

		await userEvent.keyboard("{ArrowUp}{ArrowLeft}");
		await waitFor(async () => {
			await expect(canvas.getByRole("button", { name: "12. februar 2026" })).toHaveFocus();
		});
	},
};

export const HomeAndEndStayWithinWeek: Story = {
	play: async ({ canvas }) => {
		canvas.getByRole("button", { name: "12. februar 2026" }).focus();

		// Uka går mandag-søndag: 9. til 15. februar.
		await userEvent.keyboard("{Home}");
		await waitFor(async () => {
			await expect(canvas.getByRole("button", { name: "9. februar 2026" })).toHaveFocus();
		});

		await userEvent.keyboard("{End}");
		await waitFor(async () => {
			await expect(canvas.getByRole("button", { name: "15. februar 2026" })).toHaveFocus();
		});
	},
};

export const PageUpPageDownChangesMonth: Story = {
	name: "PageUp and PageDown Change Month",
	play: async ({ canvas }) => {
		canvas.getByRole("button", { name: "12. februar 2026" }).focus();

		await userEvent.keyboard("{PageDown}");
		await waitFor(async () => {
			await expect(canvas.getByText("Mars 2026")).toBeVisible();
		});
		await expect(canvas.getByRole("button", { name: "12. mars 2026" })).toHaveFocus();

		await userEvent.keyboard("{PageUp}");
		await waitFor(async () => {
			await expect(canvas.getByText("Februar 2026")).toBeVisible();
		});
		await expect(canvas.getByRole("button", { name: "12. februar 2026" })).toHaveFocus();

		// Shift hopper et helt år.
		await userEvent.keyboard("{Shift>}{PageDown}{/Shift}");
		await waitFor(async () => {
			await expect(canvas.getByText("Februar 2027")).toBeVisible();
		});
	},
};

export const SelectsWithEnter: Story = {
	play: async ({ canvas, args }) => {
		canvas.getByRole("button", { name: "12. februar 2026" }).focus();
		await userEvent.keyboard("{ArrowRight}{Enter}");

		await waitFor(() => expect(args.onChange).toHaveBeenCalledWith(new Date(2026, 1, 13)));
		const newDay = canvas.getByRole("button", { name: "13. februar 2026" });
		await expect(newDay.closest("td")).toHaveAttribute("aria-selected", "true");
		// Valget må annonseres - fargen alene sier ingenting til en skjermleser.
		await expect(canvas.getByRole("status")).toHaveTextContent("Valgt dato: 13. februar 2026");
	},
};

export const MonthButtonsDoNotMoveFocus: Story = {
	play: async ({ canvas }) => {
		const next = canvas.getByRole("button", { name: "Neste måned" });
		await userEvent.click(next);
		await waitFor(async () => {
			await expect(canvas.getByText("Mars 2026")).toBeVisible();
		});
		// Fokus skal bli på knappen, så gjentatte klikk ikke krever ny navigasjon.
		await expect(next).toHaveFocus();

		await userEvent.click(canvas.getByRole("button", { name: "Forrige måned" }));
		await waitFor(async () => {
			await expect(canvas.getByText("Februar 2026")).toBeVisible();
		});
	},
};

export const WithBounds: Story = {
	args: {
		min: new Date(2026, 1, 10),
		max: new Date(2026, 1, 20),
		supportingText: "Oppstart må være mellom 10. og 20. februar.",
	},
	play: async ({ canvas, args }) => {
		const outside = canvas.getByRole("button", { name: "9. februar 2026" });
		await expect(outside).toHaveAttribute("aria-disabled", "true");

		await userEvent.click(outside);
		await expect(args.onChange).not.toHaveBeenCalled();

		// Museklikket landet på en sperret dag. Den er fokuserbar - en disabled
		// knapp ville låst piltastnavigasjonen mot grensa - og den interne
		// fokusdagen må ha fulgt med, ellers regner piltasten videre fra 12.
		await expect(outside).toHaveFocus();
		await userEvent.keyboard("{ArrowRight}");
		await waitFor(async () => {
			await expect(canvas.getByRole("button", { name: "10. februar 2026" })).toHaveFocus();
		});

		await userEvent.keyboard("{ArrowLeft}");
		await waitFor(async () => {
			await expect(outside).toHaveFocus();
		});
	},
};

export const WithoutLabel: Story = {
	args: { label: undefined },
	play: async ({ canvas }) => {
		// Uten synlig label må måneden bære navnet på rutenettet.
		await expect(canvas.getByRole("grid")).toHaveAccessibleName("Februar 2026");
	},
};
