import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { Slider } from "./Slider.tsx";

const meta: Meta<typeof Slider> = {
	title: "Components/Slider",
	component: Slider,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
	args: {
		label: "Lydstyrke",
		defaultValue: 40,
		onChange: fn(),
	},
	argTypes: {
		formatValue: { control: false },
		id: { table: { disable: true } },
		name: { table: { disable: true } },
		className: { table: { disable: true } },
	},
	decorators: [
		(Story) => (
			<div className="w-96">
				<Story />
			</div>
		),
	],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Fyllet skal slutte i håndtakets senter, ikke ved kanten av sporet. Håndtaket
 * beveger seg over (bredde - 24) piksler, så forventet bredde er 12 px pluss
 * andelen av den banen. En ren prosentbredde bommer med opptil 12 px i endene.
 */
function expectedFill(slider: HTMLElement, ratio: number) {
	return 12 + ratio * (slider.getBoundingClientRect().width - 24);
}

function delta(fill: HTMLElement, slider: HTMLElement, ratio: number) {
	return Math.abs(fill.getBoundingClientRect().width - expectedFill(slider, ratio));
}

export const Default: Story = {
	play: async ({ canvas }) => {
		const slider = canvas.getByRole("slider", { name: "Lydstyrke" });
		await expect(slider).toHaveValue("40");
		// Native range mapper min/max/value til aria-valuemin/max/now selv.
		// Å skrive dem én gang til for hånd er dobbeltbokføring som kan komme i utakt.
		await expect(slider).toHaveAttribute("min", "0");
		await expect(slider).toHaveAttribute("max", "100");
		await expect(slider).not.toHaveAttribute("aria-valuenow");

		// Vaktpost: fanger at Tailwind har falt ut av testoppsettet.
		const fill = canvas.getByTestId("slider-fill");
		await expect(getComputedStyle(fill).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
		await expect(delta(fill, slider, 0.4)).toBeLessThan(1);
	},
};

export const WithValue: Story = {
	args: { showValue: true, supportingText: "Gjelder alle varsler fra appen." },
	play: async ({ canvas }) => {
		const slider = canvas.getByRole("slider", { name: "Lydstyrke" });
		await expect(canvas.getByText("40")).toBeVisible();
		await expect(slider).toHaveAccessibleDescription("Gjelder alle varsler fra appen.");
	},
};

export const KeyboardNavigation: Story = {
	args: { showValue: true },
	play: async ({ canvas }) => {
		const slider = canvas.getByRole("slider", { name: "Lydstyrke" });
		await userEvent.tab();
		await expect(slider).toHaveFocus();

		// Fokusringen skal stå der i det øyeblikket fokus lander. Ligger
		// outline-color i en transition (som i transition-colors), toner ringen
		// inn fra tekstfargen over 180 ms, og da ser man ingenting med en gang.
		const ring = getComputedStyle(slider);
		await expect(ring.outlineWidth).toBe("2px");
		await expect(ring.outlineColor).toBe("rgb(76, 100, 217)");

		// Piltaster, Home, End, PageUp og PageDown er nettleserens egen oppførsel
		// på <input type="range">. Vi må ikke stå i veien for den: avlyser noen
		// keydown her, dør hele tastaturstøtten uten at noe annet ser galt ut.
		for (const key of ["ArrowRight", "ArrowLeft", "Home", "End", "PageUp", "PageDown"]) {
			const notCancelled = slider.dispatchEvent(
				new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key }),
			);
			await expect(notCancelled).toBe(true);
		}
		// Selve stegingen kan ikke drives herfra: syntetiske tastetrykk utløser
		// ingen standardhandling i nettleseren. Den verifiseres med ekte
		// tastetrykk gjennom Playwright, og verdien-til-visning testes under.
	},
};

export const ValueChange: Story = {
	args: { showValue: true },
	play: async ({ canvas, args }) => {
		const slider = canvas.getByRole("slider", { name: "Lydstyrke" });
		const fill = canvas.getByTestId("slider-fill");

		await fireEvent.change(slider, { target: { value: "41" } });
		await waitFor(async () => {
			await expect(slider).toHaveValue("41");
		});
		// Callbacken skal gi et tall, ikke strengen fra DOM-en.
		await expect(args.onChange).toHaveBeenCalledWith(41);
		await expect(canvas.getByText("41")).toBeVisible();

		await fireEvent.change(slider, { target: { value: "0" } });
		await waitFor(async () => {
			await expect(delta(fill, slider, 0)).toBeLessThan(1);
		});

		await fireEvent.change(slider, { target: { value: "100" } });
		await waitFor(async () => {
			await expect(delta(fill, slider, 1)).toBeLessThan(1);
		});
	},
};

export const HandleIsLargeEnough: Story = {
	play: async ({ canvas }) => {
		const slider = canvas.getByRole("slider", { name: "Lydstyrke" });
		// WCAG 2.2 krever 24x24 som pekermål. Kilden bruker 20.
		await expect(slider.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);

		// Selve håndtaket ligger i nettleserens skygge-DOM. Chromium gir ikke ut
		// den beregnede stilen for ::-webkit-slider-thumb - getComputedStyle med
		// pseudovelger returnerer inputens egen stil - så klassen er det eneste
		// holdepunktet herfra. Den faktiske størrelsen er sjekket i nettleseren.
		await expect(slider.className).toContain("[&::-webkit-slider-thumb]:size-6");
		await expect(slider.className).toContain("[&::-moz-range-thumb]:size-6");

		// Kontrollprøve på at size-6 faktisk er 24 px i dette temaet.
		const probe = document.createElement("div");
		probe.className = "size-6";
		slider.parentElement?.append(probe);
		await expect(probe.getBoundingClientRect().width).toBe(24);
		probe.remove();
	},
};

export const WithUnit: Story = {
	args: {
		label: "Kontrast",
		showValue: true,
		defaultValue: 60,
		formatValue: (value: number) => `${value} %`,
	},
	play: async ({ canvas }) => {
		const slider = canvas.getByRole("slider", { name: "Kontrast" });
		// Uten aria-valuetext leser skjermleseren bare "60", ikke "60 prosent".
		await expect(slider).toHaveAttribute("aria-valuetext", "60 %");
		await expect(canvas.getByText("60 %")).toBeVisible();
	},
};

export const WithSteps: Story = {
	args: {
		label: "Antall ansatte",
		min: 0,
		max: 50,
		step: 10,
		defaultValue: 20,
		showValue: true,
	},
	play: async ({ canvas }) => {
		const slider = canvas.getByRole("slider", { name: "Antall ansatte" });
		await expect(slider).toHaveAttribute("step", "10");
		await expect(slider).toHaveAttribute("max", "50");
		// 20 av 50 er 40 % av banen, ikke 40 % av sporet.
		await expect(delta(canvas.getByTestId("slider-fill"), slider, 0.4)).toBeLessThan(1);

		await fireEvent.change(slider, { target: { value: "30" } });
		await waitFor(async () => {
			await expect(delta(canvas.getByTestId("slider-fill"), slider, 0.6)).toBeLessThan(1);
		});
	},
};

export const Disabled: Story = {
	args: { disabled: true, showValue: true },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("slider", { name: "Lydstyrke" })).toBeDisabled();
	},
};
