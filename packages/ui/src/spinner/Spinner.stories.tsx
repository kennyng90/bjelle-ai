import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Spinner } from "./Spinner.tsx";

const meta: Meta<typeof Spinner> = {
	title: "Components/Spinner",
	component: Spinner,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Ubestemt ventemarkør. Rein rotasjon - ingen puls, ingen skalering.\n\n" +
					"Spinneren har alltid en tekst for skjermlesere. Den er visuelt skjult som " +
					'standard; sett `showLabel` for å vise den. `role="status"` gjør at teksten ' +
					"leses opp når spinneren dukker opp.\n\n" +
					"Rotasjonen slås av under `prefers-reduced-motion: reduce`. Da står ringen " +
					"stille med den fargede buen synlig, slik at markøren fortsatt leses som " +
					'"noe pågår".\n\n' +
					"Komponenten er ren visning uten hendelser, så `apps/web` kan bruke den uten " +
					"client-direktiv. Rendres den derimot som en del av en interaktiv øy, følger " +
					"den øyas direktiv.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		size: { control: "inline-radio", options: ["sm", "md", "lg"] },
		tone: { control: "inline-radio", options: ["brand", "neutral", "inverse"] },
		// Arvet fra HTMLAttributes. Ikke noe designeren skal skru på.
		className: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const status = canvas.getByRole("status");
		// role="status" tar ikke navn fra innholdet - det er live-regionen som
		// leses opp. Teksten må derfor stå i DOM-en, ikke i en aria-label.
		const text = canvas.getByText("Laster");
		await expect(status).toContainElement(text);
		// ... men den skal ikke ta plass. sr-only klipper den til ett piksel.
		await expect(text.getBoundingClientRect().width).toBeLessThanOrEqual(1);

		const ring = status.firstElementChild;
		if (ring === null) {
			throw new Error("Spinneren mangler ringen");
		}
		const style = getComputedStyle(ring);

		// Vaktpost: fanger at Tailwind har falt ut av testoppsettet. Uten stiler
		// er ringen fargeløs og enhver kontrastsjekk består trivielt.
		await expect(style.borderTopColor).not.toBe("rgba(0, 0, 0, 0)");
		// Sporet og buen må ha ulik farge, ellers finnes det ingen bue å se.
		await expect(style.borderTopColor).not.toBe(style.borderBottomColor);
		// Rotasjonen kommer fra animate-spin, ikke fra en inline keyframe.
		await expect(style.animationName).not.toBe("none");
	},
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex items-center gap-6">
			<Spinner {...args} size="sm" />
			<Spinner {...args} size="md" />
			<Spinner {...args} size="lg" />
		</div>
	),
};

export const Neutral: Story = {
	args: { tone: "neutral" },
};

export const Inverse: Story = {
	args: { tone: "inverse" },
	parameters: { layout: "padded" },
	render: (args) => (
		<div className="flex justify-center rounded-12 bg-background-inverse p-8">
			<Spinner {...args} />
		</div>
	),
};

export const WithVisibleText: Story = {
	args: { showLabel: true, label: "Laster varsler" },
	play: async ({ canvas }) => {
		const text = canvas.getByText("Laster varsler");
		await expect(text).toBeVisible();
		await expect(text.getBoundingClientRect().width).toBeGreaterThan(1);
		await expect(canvas.getByRole("status")).toContainElement(text);
	},
};
