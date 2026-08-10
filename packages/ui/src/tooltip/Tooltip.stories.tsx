import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor } from "storybook/test";
import { Button } from "../button/Button.tsx";
import { Tooltip } from "./Tooltip.tsx";

const meta: Meta<typeof Tooltip> = {
	title: "Components/Tooltip",
	component: Tooltip,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { label: "Kopier lenken til utklippstavlen" },
	argTypes: {
		side: { control: "inline-radio", options: ["top", "bottom", "left", "right"] },
	},
	render: (args) => (
		<Tooltip {...args}>
			<Button aria-label="Kopier lenke" leadingIcon="Link" variant="secondary" />
		</Tooltip>
	),
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Tipset vises på hover. Utløseren har sitt eget navn - tipset utdyper, det
 * er aldri eneste kilde til informasjon.
 */
export const Default: Story = {
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button", { name: "Kopier lenke" });
		await expect(canvas.queryByRole("tooltip")).toBeNull();

		await userEvent.hover(button);
		const tooltip = await canvas.findByRole("tooltip");
		await expect(tooltip).toHaveTextContent("Kopier lenken til utklippstavlen");
		await expect(button).toHaveAttribute("aria-describedby", tooltip.id);

		// Vaktpost mot at Tailwind faller ut av testoppsettet.
		await expect(getComputedStyle(tooltip).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
	},
};

/**
 * Tipset må også vises for tastaturbrukere, og lukkes med Escape uten at
 * fokus flytter seg (WCAG 1.4.13 Dismissible).
 */
export const KeyboardFocus: Story = {
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button", { name: "Kopier lenke" });

		await userEvent.tab();
		await expect(button).toHaveFocus();
		await expect(await canvas.findByRole("tooltip")).toBeVisible();

		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(canvas.queryByRole("tooltip")).toBeNull());
		await expect(button).toHaveFocus();
	},
};

/**
 * WCAG 1.4.13 Dismissible gjelder også når tipset er åpnet med pekeren. Da står
 * fokus fortsatt på `<body>`, og en tastelytter på utløseren ville aldri sett
 * Escape - pekerbrukeren satt igjen uten noen måte å lukke tipset på.
 */
export const EscapeDismissesHoveredTooltip: Story = {
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button", { name: "Kopier lenke" });

		await userEvent.hover(button);
		await canvas.findByRole("tooltip");
		// Kontrollprøve: hadde noe her hatt fokus, ville storyen bevist noe annet
		// enn den skal - da er en lytter på utløseren nok.
		await expect(button).not.toHaveFocus();

		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(canvas.queryByRole("tooltip")).toBeNull());

		// Og det forblir lukket. Fjerningen av boblen endrer DOM-en under
		// pekeren, og nettleseren svarer med en ny enter-kjede; åpnet tipset seg
		// på den, ville Escape vært uten virkning i praksis.
		await userEvent.hover(button);
		await expect(canvas.queryByRole("tooltip")).toBeNull();
	},
};

/**
 * Regresjonsvakt for en flakete testkjøring, og for en ekte feil bak den.
 *
 * Nettleseren sender en full `mouseover`/`mouseenter`-kjede uten at pekeren har
 * rørt seg, hver gang DOM-en under den endrer seg - komponenten monteres under
 * en hvilende peker, eller boblen fjernes igjen. Åpnes tipset på `mouseenter`,
 * dukker det opp uten at noen har pekt på noe.
 *
 * Hendelsene under er nøyaktig de nettleseren selv sendte i CI, `relatedTarget`
 * inkludert: den pekte på forrige storys node, som allerede var revet ut.
 */
export const StationaryPointerDoesNotOpen: Story = {
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button", { name: "Kopier lenke" });
		const detached = document.createElement("span");

		fireEvent.mouseOver(button, { relatedTarget: detached });
		fireEvent.mouseEnter(button, { relatedTarget: detached });
		await expect(canvas.queryByRole("tooltip")).toBeNull();

		// Positiv kontroll: uten den ville storyen bestått selv om tipset aldri
		// åpnet seg i det hele tatt. Et ekte pekerbesøk gir `mousemove`.
		fireEvent.mouseMove(button);
		await expect(await canvas.findByRole("tooltip")).toBeVisible();
	},
};

/**
 * WCAG 1.4.13 Hoverable: pekeren må kunne flyttes fra utløseren og inn i
 * tipset uten at det forsvinner. Avstanden mellom dem er gjennomsiktig
 * polstring på tipset, ikke et hull.
 */
export const PointerCanMoveIntoTooltip: Story = {
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button", { name: "Kopier lenke" });

		await userEvent.hover(button);
		const tooltip = await canvas.findByRole("tooltip");

		// userEvent regner mouseenter/mouseleave ut fra DOM-treet, ikke fra
		// geometri, så en hover-runde her ville bestått selv med et ekte hull
		// mellom utløser og tips. Kravet er geometrisk, og måles som geometri:
		// den hover-følsomme flaten rundt tipset må berøre utløseren.
		const bridge = (tooltip.parentElement as HTMLElement).getBoundingClientRect();
		const trigger = button.getBoundingClientRect();
		await expect(bridge.bottom).toBeGreaterThanOrEqual(trigger.top - 0.5);

		// ...samtidig som selve boblen står 8 px unna, slik den skal se ut.
		const bubble = tooltip.getBoundingClientRect();
		await expect(trigger.top - bubble.bottom).toBeCloseTo(8, 0);

		await userEvent.hover(tooltip);
		await expect(canvas.queryByRole("tooltip")).toBeVisible();

		await userEvent.unhover(tooltip);
		await waitFor(() => expect(canvas.queryByRole("tooltip")).toBeNull());
	},
};

export const Sides: Story = {
	render: (args) => (
		<div className="grid grid-cols-2 gap-16 p-16">
			<Tooltip {...args} label="Over" side="top">
				<Button variant="secondary">Over</Button>
			</Tooltip>
			<Tooltip {...args} label="Under" side="bottom">
				<Button variant="secondary">Under</Button>
			</Tooltip>
			<Tooltip {...args} label="Til venstre" side="left">
				<Button variant="secondary">Venstre</Button>
			</Tooltip>
			<Tooltip {...args} label="Til høyre" side="right">
				<Button variant="secondary">Høyre</Button>
			</Tooltip>
		</div>
	),
};

export const LongText: Story = {
	args: {
		label: "Lenken gjelder i sju dager og gir lesetilgang til hele porteføljen.",
		side: "bottom",
	},
	play: async ({ canvas }) => {
		await userEvent.hover(canvas.getByRole("button", { name: "Kopier lenke" }));
		await canvas.findByRole("tooltip");
	},
};

export const DarkTheme: Story = {
	globals: { theme: "dark" },
	args: { side: "bottom" },
	play: async ({ canvas }) => {
		await userEvent.hover(canvas.getByRole("button", { name: "Kopier lenke" }));
		await canvas.findByRole("tooltip");
	},
};
