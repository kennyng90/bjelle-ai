import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { ProgressBar } from "./ProgressBar.tsx";

const meta: Meta<typeof ProgressBar> = {
	title: "Components/ProgressBar",
	component: ProgressBar,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Framdrift med kjent eller ukjent slutt.\n\n" +
					'Sporet er selve `role="progressbar"`-elementet, og alle ekstra props ' +
					"(`aria-label`, `id`, `data-*`) havner der. `className` styler wrapperen.\n\n" +
					"Baren må ha et tilgjengelig navn. Gi den enten `label` - som blir en synlig " +
					"etikett koblet med `aria-labelledby` - eller `aria-label` når etiketten " +
					"finnes i konteksten fra før.\n\n" +
					"Er `max` noe annet enn 100, regner skjermleseren likevel ut prosent. Sett " +
					'`valueText` når prosenten ikke er hele historien, f.eks. "3 av 8 steg".\n\n' +
					"`indeterminate` utelater `aria-valuenow` - det er slik ukjent framdrift " +
					"skal uttrykkes. Komponenten er ren visning, så `apps/web` trenger ikke " +
					"client-direktiv med mindre verdien oppdateres av en øy.",
			},
		},
	},
	tags: ["autodocs"],
	args: { label: "Laster opp filer", value: 40 },
	argTypes: {
		size: { control: "inline-radio", options: ["sm", "md", "lg"] },
		tone: { control: "inline-radio", options: ["brand", "success", "error"] },
		value: { control: { type: "range", min: 0, max: 100, step: 1 } },
		className: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { showValue: true },
	play: async ({ canvas }) => {
		const bar = canvas.getByRole("progressbar", { name: "Laster opp filer" });
		await expect(bar).toHaveAttribute("aria-valuenow", "40");
		await expect(bar).toHaveAttribute("aria-valuemin", "0");
		await expect(bar).toHaveAttribute("aria-valuemax", "100");

		const fill = bar.firstElementChild;
		if (fill === null) {
			throw new Error("Baren mangler fyllet");
		}
		// Vaktpost: uten Tailwind er fyllet gjennomsiktig og alt består trivielt.
		await expect(getComputedStyle(fill).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
		// Bredden er ekte dynamisk verdi og skal følge value.
		await expect(
			fill.getBoundingClientRect().width / bar.getBoundingClientRect().width,
		).toBeCloseTo(0.4, 2);
	},
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex flex-col gap-6">
			<ProgressBar {...args} label="Liten" size="sm" />
			<ProgressBar {...args} label="Middels" size="md" />
			<ProgressBar {...args} label="Stor" size="lg" />
		</div>
	),
};

export const Tones: Story = {
	render: (args) => (
		<div className="flex flex-col gap-6">
			<ProgressBar {...args} label="Laster opp filer" tone="brand" />
			<ProgressBar {...args} label="Synkronisering fullført" tone="success" value={100} />
			<ProgressBar {...args} label="Overføringen stoppet opp" tone="error" value={62} />
		</div>
	),
};

export const WithValueText: Story = {
	args: { max: 8, value: 3, valueText: "3 av 8 steg", showValue: false },
	play: async ({ canvas }) => {
		const bar = canvas.getByRole("progressbar", { name: "Laster opp filer" });
		await expect(bar).toHaveAttribute("aria-valuenow", "3");
		await expect(bar).toHaveAttribute("aria-valuemax", "8");
		await expect(bar).toHaveAttribute("aria-valuetext", "3 av 8 steg");
	},
};

export const Indeterminate: Story = {
	args: { indeterminate: true, label: "Søker gjennom arkivet" },
	play: async ({ canvas }) => {
		const bar = canvas.getByRole("progressbar", { name: "Søker gjennom arkivet" });
		// Ukjent framdrift har ingen verdi. Står aria-valuenow der, lyver den.
		await expect(bar).not.toHaveAttribute("aria-valuenow");
		await expect(bar).not.toHaveAttribute("aria-valuetext");
		await expect(bar).toHaveAttribute("aria-valuemax", "100");

		const fill = bar.firstElementChild;
		if (fill === null) {
			throw new Error("Baren mangler fyllet");
		}
		// Sveipet kommer fra @theme-blokka i packages/ui/styles.css. Faller den
		// ut av Tailwind-kjeden, står segmentet stille og ser ut som 33 %.
		await expect(getComputedStyle(fill).animationName).toBe("progress-sweep");
	},
};

export const Empty: Story = {
	args: { value: 0, showValue: true },
	play: async ({ canvas }) => {
		const bar = canvas.getByRole("progressbar", { name: "Laster opp filer" });
		await expect(bar).toHaveAttribute("aria-valuenow", "0");
		const fill = bar.firstElementChild;
		if (fill === null) {
			throw new Error("Baren mangler fyllet");
		}
		await expect(fill.getBoundingClientRect().width).toBe(0);
	},
};

export const Complete: Story = {
	args: { value: 100, showValue: true, tone: "success" },
};

export const WithoutVisibleLabel: Story = {
	args: { label: undefined, showValue: true, "aria-label": "Fullført andel av oppgavene" },
	play: async ({ canvas }) => {
		const bar = canvas.getByRole("progressbar");
		await expect(bar).toHaveAccessibleName("Fullført andel av oppgavene");

		// Prosenten står i høyre kant også når det ikke finnes en etikett å
		// skyve mot. Ellers hopper den fra høyre til venstre når etiketten går.
		const percent = canvas.getByText("40 %");
		await expect(percent.getBoundingClientRect().right).toBeCloseTo(
			bar.getBoundingClientRect().right,
			0,
		);
	},
};
