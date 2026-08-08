import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { ToggleGroup } from "./ToggleGroup.tsx";

const meta: Meta<typeof ToggleGroup> = {
	title: "Components/ToggleGroup",
	component: ToggleGroup,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: {
		label: "Tidsrom",
		options: ["Dag", "Uke", "Måned"],
		defaultValue: "Uke",
		onChange: fn(),
	},
	argTypes: {
		options: { control: false },
		size: { control: "inline-radio", options: ["sm", "md"] },
		id: { table: { disable: true } },
		className: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		// Dette er en radiogruppe forkledd som knapper, ikke tre løse knapper.
		const group = canvas.getByRole("radiogroup", { name: "Tidsrom" });
		await expect(group).toBeVisible();
		await expect(getComputedStyle(group).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");

		const options = canvas.getAllByRole("radio");
		await expect(options).toHaveLength(3);
		await expect(canvas.getByRole("radio", { name: "Uke" })).toBeChecked();
		await expect(canvas.getByRole("radio", { name: "Dag" })).not.toBeChecked();
	},
};

export const RovingTabindex: Story = {
	play: async ({ canvas }) => {
		// Bare det valgte segmentet ligger i tabrekkefølgen. Ellers må brukeren
		// tabbe seg gjennom hele gruppa for å komme forbi den.
		await expect(canvas.getByRole("radio", { name: "Uke" })).toHaveAttribute("tabindex", "0");
		await expect(canvas.getByRole("radio", { name: "Dag" })).toHaveAttribute("tabindex", "-1");
		await expect(canvas.getByRole("radio", { name: "Måned" })).toHaveAttribute("tabindex", "-1");

		await userEvent.tab();
		const selected = canvas.getByRole("radio", { name: "Uke" });
		await expect(selected).toHaveFocus();

		// Fokusringen skal stå der i det øyeblikket fokus lander. Ligger
		// outline-color i en transition (som i transition-colors), toner ringen
		// inn fra tekstfargen over 180 ms, og da ser man ingenting med en gang.
		const ring = getComputedStyle(selected);
		await expect(ring.outlineWidth).toBe("2px");
		await expect(ring.outlineColor).toBe("rgb(76, 100, 217)");

		await userEvent.tab();
		await expect(canvas.getByRole("radio", { name: "Uke" })).not.toHaveFocus();
	},
};

export const ArrowKeysMoveSelection: Story = {
	play: async ({ canvas, args }) => {
		canvas.getByRole("radio", { name: "Uke" }).focus();

		await userEvent.keyboard("{ArrowRight}");
		await waitFor(async () => {
			await expect(canvas.getByRole("radio", { name: "Måned" })).toBeChecked();
		});
		await expect(canvas.getByRole("radio", { name: "Måned" })).toHaveFocus();
		await expect(args.onChange).toHaveBeenCalledWith("Måned");

		// Pil videre fra siste går rundt til første.
		await userEvent.keyboard("{ArrowRight}");
		await waitFor(async () => {
			await expect(canvas.getByRole("radio", { name: "Dag" })).toBeChecked();
		});

		await userEvent.keyboard("{ArrowLeft}");
		await waitFor(async () => {
			await expect(canvas.getByRole("radio", { name: "Måned" })).toBeChecked();
		});

		await userEvent.keyboard("{Home}");
		await waitFor(async () => {
			await expect(canvas.getByRole("radio", { name: "Dag" })).toBeChecked();
		});

		await userEvent.keyboard("{End}");
		await waitFor(async () => {
			await expect(canvas.getByRole("radio", { name: "Måned" })).toBeChecked();
		});
	},
};

export const SelectsWithMouse: Story = {
	play: async ({ canvas, args }) => {
		await userEvent.click(canvas.getByRole("radio", { name: "Dag" }));
		await waitFor(() => expect(args.onChange).toHaveBeenCalledWith("Dag"));
		await expect(canvas.getByRole("radio", { name: "Dag" })).toBeChecked();
		await expect(canvas.getByRole("radio", { name: "Dag" })).toHaveAttribute("tabindex", "0");
	},
};

export const IndicatorRespectsReducedMotion: Story = {
	play: async ({ canvas }) => {
		const indicator = canvas.getByTestId("segmented-indicator");
		// Glidende indikator er pynt. Den skal stå stille for den som har bedt om det.
		await expect(indicator.className).toContain("motion-reduce:transition-none");
		await expect(getComputedStyle(indicator).transitionProperty).toContain("transform");
		// Indikatoren står under segment nummer to, ikke i utgangsstilling.
		await expect(getComputedStyle(indicator).transform).not.toBe("none");
		await expect(getComputedStyle(indicator).transform).not.toContain("1, 0, 0, 1, 0, 0");
	},
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex flex-col items-start gap-4">
			<ToggleGroup {...args} label="Tidsrom, liten" size="sm" />
			<ToggleGroup {...args} label="Tidsrom, medium" size="md" />
		</div>
	),
};

export const HiddenLabel: Story = {
	args: { hideLabel: true },
	play: async ({ canvas }) => {
		// Labelen forsvinner for øyet, ikke for skjermleseren.
		await expect(canvas.getByRole("radiogroup", { name: "Tidsrom" })).toBeVisible();
		const label = canvas.getByText("Tidsrom");
		await expect(label.getBoundingClientRect().height).toBeLessThanOrEqual(1);
		await expect(label.getBoundingClientRect().width).toBeLessThanOrEqual(1);
	},
};

export const FullWidth: Story = {
	parameters: { layout: "padded" },
	args: { fullWidth: true },
};

export const WithIcons: Story = {
	args: {
		label: "Visning",
		options: [
			{ value: "liste", label: "Liste", icon: "List" as const },
			{ value: "rutenett", label: "Rutenett", icon: "LayoutGrid" as const },
			{ value: "kalender", label: "Kalender", icon: "Calendar" as const },
		],
		defaultValue: "rutenett",
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("radio", { name: "Rutenett" })).toBeChecked();
	},
};

export const WithDisabledOption: Story = {
	args: {
		options: [
			{ value: "Dag", label: "Dag" },
			{ value: "Uke", label: "Uke", disabled: true },
			{ value: "Måned", label: "Måned" },
		],
		defaultValue: "Dag",
	},
	play: async ({ canvas, args }) => {
		canvas.getByRole("radio", { name: "Dag" }).focus();
		// Piltasten hopper over det sperrede valget i stedet for å låse seg.
		await userEvent.keyboard("{ArrowRight}");
		await waitFor(async () => {
			await expect(canvas.getByRole("radio", { name: "Måned" })).toBeChecked();
		});
		await expect(args.onChange).not.toHaveBeenCalledWith("Uke");
	},
};

export const Disabled: Story = {
	args: { disabled: true },
	play: async ({ canvas }) => {
		for (const option of canvas.getAllByRole("radio")) {
			await expect(option).toBeDisabled();
		}
	},
};
