import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { Button } from "../button/Button.tsx";
import { Alert, type AlertTone } from "./Alert.tsx";

const tones: { tone: AlertTone; title: string; text: string }[] = [
	{ tone: "neutral", title: "Ingen endringer", text: "Porteføljen er uendret siden i går." },
	{ tone: "brand", title: "Ny funksjon", text: "Du kan nå eksportere porteføljen til CSV." },
	{ tone: "success", title: "Ordren er lagt inn", text: "Handelen gjøres opp om to virkedager." },
	{ tone: "warning", title: "Bekreft e-postadressen", text: "Vi sendte en lenke til deg." },
	{ tone: "error", title: "Ordren ble avvist", text: "Det er ikke nok dekning på kontoen." },
	{ tone: "info", title: "Børsen er stengt", text: "Ordre lagt inn nå utføres ved åpning." },
];

const meta: Meta<typeof Alert> = {
	title: "Components/Alert",
	component: Alert,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
	args: {
		title: "Bekreft e-postadressen",
		children: "Vi sendte en lenke til kenny@bjelle.no. Lenken varer i 24 timer.",
		tone: "warning",
	},
	argTypes: {
		tone: {
			control: "inline-radio",
			options: ["neutral", "brand", "success", "warning", "error", "info"],
		},
		announce: { control: "inline-radio", options: ["none", "polite", "assertive"] },
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

		// En boks som står i dokumentet fra start skal ikke være et live-område.
		// role="alert" her ville blitt lest opp ved sideinnlasting.
		await expect(canvas.queryByRole("alert")).toBeNull();
		await expect(canvas.queryByRole("status")).toBeNull();
	},
};

export const Tones: Story = {
	render: (args) => (
		<div className="flex flex-col gap-3">
			{tones.map(({ tone, title, text }) => (
				<Alert {...args} key={tone} title={title} tone={tone}>
					{text}
				</Alert>
			))}
		</div>
	),
};

export const TextOnly: Story = {
	args: { title: undefined },
};

export const WithAction: Story = {
	args: {
		action: (
			<Button size="sm" variant="secondary">
				Send lenken på nytt
			</Button>
		),
	},
};

/**
 * Lukkeknappen har et navn, ikke bare et kryss, og er minst 24x24 CSS-piksler.
 */
export const Dismissible: Story = {
	args: { onDismiss: fn() },
	play: async ({ args, canvas }) => {
		const close = canvas.getByRole("button", { name: "Lukk melding" });
		const box = close.getBoundingClientRect();
		await expect(box.width).toBeGreaterThanOrEqual(24);
		await expect(box.height).toBeGreaterThanOrEqual(24);

		await userEvent.tab();
		await expect(close).toHaveFocus();
		await expect(getComputedStyle(close).outlineWidth).toBe("2px");
		await userEvent.keyboard("{Enter}");
		await expect(args.onDismiss).toHaveBeenCalled();
	},
};

/**
 * En melding som dukker opp som svar på en handling skal annonseres.
 * `polite` gir `role="status"`, `assertive` gir `role="alert"` og avbryter
 * opplesningen - det siste er kun for feil som stopper brukeren.
 */
export const Announced: Story = {
	render: (args) => (
		<div className="flex flex-col gap-3">
			<Alert {...args} announce="polite" title="Kladden er lagret" tone="success">
				Endringene ligger klare neste gang du åpner ordren.
			</Alert>
			<Alert {...args} announce="assertive" title="Ordren ble avvist" tone="error">
				Det er ikke nok dekning på kontoen.
			</Alert>
		</div>
	),
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("status")).toHaveTextContent("Kladden er lagret");
		await expect(canvas.getByRole("alert")).toHaveTextContent("Ordren ble avvist");
	},
};

export const DarkTheme: Story = {
	globals: { theme: "dark" },
	args: { onDismiss: fn() },
	render: (args) => (
		<div className="flex flex-col gap-3">
			{tones.map(({ tone, title, text }) => (
				<Alert {...args} key={tone} title={title} tone={tone}>
					{text}
				</Alert>
			))}
		</div>
	),
};
