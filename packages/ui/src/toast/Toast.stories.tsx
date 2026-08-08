import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { Toast, type ToastTone } from "./Toast.tsx";

const tones: { tone: ToastTone; title: string; text: string }[] = [
	{ tone: "neutral", title: "Kladden er lagret", text: "Du finner den igjen under Ordre." },
	{ tone: "success", title: "Ordren er lagt inn", text: "Handelen gjøres opp om to virkedager." },
	{ tone: "warning", title: "Kursen har endret seg", text: "Sjekk beløpet før du bekrefter." },
	{ tone: "error", title: "Ordren ble avvist", text: "Det er ikke nok dekning på kontoen." },
	{ tone: "info", title: "Børsen er stengt", text: "Ordren utføres ved åpning i morgen." },
];

const meta: Meta<typeof Toast> = {
	title: "Components/Toast",
	component: Toast,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: {
		title: "Ordren er lagt inn",
		children: "Handelen gjøres opp om to virkedager.",
		tone: "success",
		onDismiss: fn(),
	},
	argTypes: {
		tone: {
			control: "inline-radio",
			options: ["neutral", "success", "warning", "error", "info"],
		},
		icon: { control: false },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas, canvasElement }) => {
		// Vaktpost mot at Tailwind faller ut av testoppsettet.
		const box = canvasElement.firstElementChild as HTMLElement;
		await expect(getComputedStyle(box).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");

		// Ikke-hastende varsler er høflige live-områder.
		await expect(canvas.getByRole("status")).toHaveTextContent("Ordren er lagt inn");
	},
};

export const Tones: Story = {
	render: (args) => (
		<div className="flex flex-col gap-3">
			{tones.map(({ tone, title, text }) => (
				<Toast {...args} key={tone} title={title} tone={tone}>
					{text}
				</Toast>
			))}
		</div>
	),
};

/**
 * Feil avbryter opplesningen. Alle andre toner venter til skjermleseren er
 * ledig, slik at et lagringsvarsel ikke klipper over det brukeren holder på med.
 */
export const ErrorState: Story = {
	name: "Error",
	args: { tone: "error", title: "Ordren ble avvist", children: "Det er ikke nok dekning." },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("alert")).toHaveTextContent("Ordren ble avvist");
		await expect(canvas.queryByRole("status")).toBeNull();
	},
};

export const WithAction: Story = {
	args: {
		action: (
			<button
				className="-mx-1 inline-flex min-h-6 items-center rounded-4 px-1 font-strong text-small text-text-inverse-strong underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-inverse-stronger"
				type="button"
			>
				Angre
			</button>
		),
	},
};

export const WithoutTitle: Story = {
	args: { title: undefined, children: "Kladden er lagret." },
};

/**
 * Med `duration` lukker varselet seg selv.
 */
export const AutoDismiss: Story = {
	args: { duration: 300, onDismiss: fn() },
	play: async ({ args }) => {
		await waitFor(() => expect(args.onDismiss).toHaveBeenCalled(), { timeout: 3000 });
	},
};

/**
 * WCAG 2.2.1: en tidsgrense må kunne stanses. Nedtellingen står stille så
 * lenge pekeren er over varselet, og starter først når den forlater det.
 */
export const AutoDismissPausesOnHover: Story = {
	args: { duration: 300, onDismiss: fn() },
	play: async ({ args, canvasElement }) => {
		const box = canvasElement.firstElementChild as HTMLElement;

		await userEvent.hover(box);
		await new Promise((r) => setTimeout(r, 900));
		await expect(args.onDismiss).not.toHaveBeenCalled();

		await userEvent.unhover(box);
		await waitFor(() => expect(args.onDismiss).toHaveBeenCalled(), { timeout: 3000 });
	},
};

/**
 * Samme krav for tastatur: lukkeknappen må rekkes med Tab før varselet
 * forsvinner, så nedtellingen står stille mens fokus er inne i varselet.
 */
export const AutoDismissPausesOnFocus: Story = {
	args: { duration: 300, onDismiss: fn() },
	play: async ({ args, canvas }) => {
		await userEvent.tab();
		const close = canvas.getByRole("button", { name: "Lukk varsel" });
		await expect(close).toHaveFocus();
		await expect(getComputedStyle(close).outlineWidth).toBe("2px");

		await new Promise((r) => setTimeout(r, 900));
		await expect(args.onDismiss).not.toHaveBeenCalled();

		await userEvent.keyboard("{Enter}");
		await expect(args.onDismiss).toHaveBeenCalledTimes(1);
	},
};

export const DarkTheme: Story = {
	globals: { theme: "dark" },
	render: (args) => (
		<div className="flex flex-col gap-3">
			{tones.map(({ tone, title, text }) => (
				<Toast {...args} key={tone} title={title} tone={tone}>
					{text}
				</Toast>
			))}
		</div>
	),
};
