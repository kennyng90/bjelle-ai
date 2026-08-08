import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { TextLink } from "../text-link/TextLink.tsx";
import { Accordion } from "./Accordion.tsx";

const questions = [
	{
		title: "Hvordan fungerer refusjon?",
		content:
			"Vi betaler tilbake til samme kort du betalte med. Pengene er normalt framme innen fem virkedager.",
	},
	{
		title: "Kan jeg bytte abonnement midt i perioden?",
		content: "Ja. Du betaler differansen for resten av perioden, og endringen gjelder umiddelbart.",
	},
	{
		title: "Hvor lenge lagrer dere dataene mine?",
		content: "Så lenge kontoen er aktiv, og i 90 dager etter at du har slettet den.",
	},
];

const meta: Meta<typeof Accordion> = {
	title: "Components/Accordion",
	component: Accordion,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
	args: { items: questions },
	argTypes: {
		type: { control: "inline-radio", options: ["single", "multiple"] },
		headingLevel: { control: "inline-radio", options: [2, 3, 4, 5, 6] },
		items: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const buttons = canvas.getAllByRole("button");
		await expect(buttons).toHaveLength(3);

		// Overskriften er en knapp inne i et ekte overskriftselement.
		await expect(canvas.getAllByRole("heading", { level: 3 })).toHaveLength(3);
		await expect(buttons[0]).toHaveAttribute("aria-expanded", "false");

		// Lukket panel er ute av tilgjengelighetstreet: inert tar det ut av
		// både tabrekkefølgen og opplesningen, aria-hidden bekrefter det.
		const panelId = buttons[0].getAttribute("aria-controls");
		const panel = panelId ? document.getElementById(panelId) : null;
		await expect(panel).not.toBeNull();
		await expect(panel).toHaveAttribute("inert");
		await expect(canvas.queryAllByRole("region")).toHaveLength(0);
	},
};

export const OpenByDefault: Story = {
	args: { items: [{ ...questions[0], defaultOpen: true }, questions[1], questions[2]] },
	play: async ({ canvas }) => {
		const buttons = canvas.getAllByRole("button");
		await expect(buttons[0]).toHaveAttribute("aria-expanded", "true");

		const region = canvas.getByRole("region");
		await expect(region).toHaveAccessibleName("Hvordan fungerer refusjon?");
	},
};

export const MultipleOpen: Story = {
	args: { type: "multiple" },
	play: async ({ canvas }) => {
		const buttons = canvas.getAllByRole("button");

		await userEvent.click(buttons[0]);
		await userEvent.click(buttons[1]);
		await waitFor(() => expect(buttons[0]).toHaveAttribute("aria-expanded", "true"));
		await waitFor(() => expect(buttons[1]).toHaveAttribute("aria-expanded", "true"));
		await expect(canvas.getAllByRole("region")).toHaveLength(2);
	},
};

export const OneAtATime: Story = {
	args: { type: "single" },
	play: async ({ canvas }) => {
		const buttons = canvas.getAllByRole("button");

		await userEvent.click(buttons[0]);
		await waitFor(() => expect(buttons[0]).toHaveAttribute("aria-expanded", "true"));

		await userEvent.click(buttons[1]);
		await waitFor(() => expect(buttons[0]).toHaveAttribute("aria-expanded", "false"));
		await expect(buttons[1]).toHaveAttribute("aria-expanded", "true");
		await expect(canvas.getAllByRole("region")).toHaveLength(1);
	},
};

export const HeadingLevel: Story = {
	args: { headingLevel: 2 },
	play: async ({ canvas }) => {
		await expect(canvas.getAllByRole("heading", { level: 2 })).toHaveLength(3);
	},
};

export const KeyboardNavigation: Story = {
	play: async ({ canvas }) => {
		const buttons = canvas.getAllByRole("button");

		await userEvent.tab();
		await waitFor(() => expect(buttons[0]).toHaveFocus());

		await userEvent.keyboard("{Enter}");
		await waitFor(() => expect(buttons[0]).toHaveAttribute("aria-expanded", "true"));

		await userEvent.tab();
		await waitFor(() => expect(buttons[1]).toHaveFocus());

		await userEvent.keyboard(" ");
		await waitFor(() => expect(buttons[1]).toHaveAttribute("aria-expanded", "true"));

		await userEvent.keyboard(" ");
		await waitFor(() => expect(buttons[1]).toHaveAttribute("aria-expanded", "false"));
	},
};

const withLinks = [
	{
		title: "Hvor finner jeg fakturaene mine?",
		content: (
			<p>
				Alle fakturaer ligger under <TextLink href="#fakturaer">Fakturaer</TextLink> i menyen.
			</p>
		),
	},
	{
		title: "Hvordan endrer jeg betalingsmåte?",
		content: (
			<p>
				Du bytter kort under <TextLink href="#betaling">Betaling</TextLink>.
			</p>
		),
	},
];

export const FocusableContent: Story = {
	args: { items: withLinks },
	play: async ({ canvas, canvasElement }) => {
		const buttons = canvas.getAllByRole("button");
		const links = canvasElement.querySelectorAll("a");
		await expect(links).toHaveLength(2);

		// Lenkene i de lukkede panelene står i DOM-en, men er ute av
		// tilgjengelighetstreet og lar seg ikke fokusere. Uten inert ville
		// Tab landet i et panel med høyde null.
		await expect(canvas.queryAllByRole("link")).toHaveLength(0);
		links[0].focus();
		await expect(links[0]).not.toHaveFocus();

		// Åpnes panelet, blir lenken fokuserbar igjen.
		await userEvent.click(buttons[0]);
		await waitFor(() => expect(canvas.getAllByRole("link")).toHaveLength(1));
		const openLink = canvas.getByRole("link", { name: "Fakturaer" });
		openLink.focus();
		await expect(openLink).toHaveFocus();
	},
};
