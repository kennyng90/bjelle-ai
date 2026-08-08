import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { Button } from "../button/Button.tsx";
import { Drawer, type DrawerProps } from "./Drawer.tsx";

type DemoProps = Omit<DrawerProps, "open">;

/**
 * Drawer er kontrollert. Storyene eier `open`, akkurat som en app ville gjort.
 * `startOpen` gir dokumentasjonssidene en variant som viser innholdet uten at
 * noen må klikke først.
 */
function makeDemo(startOpen: boolean) {
	return function Demo({ onClose, ...args }: DemoProps) {
		const [open, setOpen] = useState(startOpen);
		return (
			<>
				<Button onClick={() => setOpen(true)}>Åpne skuffen</Button>
				<Drawer
					{...args}
					onClose={() => {
						setOpen(false);
						onClose();
					}}
					open={open}
				/>
			</>
		);
	};
}

const Demo = makeDemo(false);
const OpenDemo = makeDemo(true);

/** Stories som starter åpne får sin egen iframe i autodocs. Uten det ville
 * skuffen ligge i topplaget og dekke hele dokumentasjonssiden. */
const ownFrame = { docs: { story: { inline: false, iframeHeight: 420 } } };

const meta: Meta<typeof Drawer> = {
	title: "Components/Drawer",
	component: Drawer,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: {
		title: "Filtre",
		children:
			"Velg hvilke rapporter som skal vises. Filtrene lagres på arbeidsområdet og gjelder til du fjerner dem.",
		onClose: fn(),
	},
	argTypes: {
		side: { control: "inline-radio", options: ["left", "right", "top", "bottom"] },
		size: { control: "inline-radio", options: ["sm", "md", "lg"] },
		// Storyene eier tilstanden. En kontroll her ville bare komme ut av takt.
		open: { control: false },
		onClose: { control: false },
	},
	render: (args) => <Demo {...args} />,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ args, canvas }) => {
		const trigger = canvas.getByRole("button", { name: "Åpne skuffen" });
		await userEvent.click(trigger);

		const dialog = await canvas.findByRole("dialog");
		await expect(dialog).toHaveAccessibleName("Filtre");

		// Vaktpost: uten Tailwind i testoppsettet er alt ustilt, og enhver
		// kontrastsjekk består trivielt.
		await expect(getComputedStyle(dialog).position).toBe("fixed");

		// :modal er sann kun for dialoger åpnet med showModal(). Det er beviset
		// på at nettleseren har fokusfelle, inert bakgrunn og topplag - noe
		// syntetiske Tab-trykk fra user-event ikke kan måle.
		await expect(dialog.matches(":modal")).toBe(true);

		// Fokus skal ha flyttet seg inn i skuffen ved åpning.
		await expect(dialog).toContainElement(document.activeElement as HTMLElement);

		await userEvent.keyboard("{Escape}");

		// Lukket dialog skal ikke finnes i tilgjengelighetstreet.
		await waitFor(() => expect(canvas.queryByRole("dialog")).toBeNull());
		await expect(args.onClose).toHaveBeenCalledOnce();
		await expect(trigger).toHaveFocus();
	},
};

/**
 * Skuffen skal gli ut igjen, ikke bare forsvinne. En `<dialog>` er
 * `display: none` med én gang `[open]` faller bort, og display og overlay er
 * diskrete egenskaper - uten `allow-discrete` er panelet borte før det har
 * flyttet seg en piksel.
 */
export const SlidesOutOnClose: Story = {
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Åpne skuffen" }));
		const dialog = await canvas.findByRole("dialog");

		// Utglidningen kan ikke leses av en spørring mot DOM-en, så den måles på
		// overgangene nettleseren faktisk starter. Hendelsene bobler opp til
		// dialogen, og bakteppet kjenner vi igjen på pseudoElement.
		const started: string[] = [];
		dialog.addEventListener("transitionstart", (event) => {
			started.push(`${event.pseudoElement}|${event.propertyName}`);
		});

		/*
		 * Innglidningen må være ferdig før vi lukker, og det er ikke pynt.
		 * Lukkes skuffen i samme frame som den åpnet, står panelet fortsatt på
		 * utsiden - da er verdien det skal gå *til* den samme som verdien det
		 * står på, og nettleseren avlyser overgangen i stedet for å starte en
		 * ny. Testen ville vært rød uansett hvor riktig CSS-en var.
		 *
		 * Ventingen er samtidig dekning for veien inn: `0px` er hvilestillingen
		 * ved kanten, og den nås bare hvis `@starting-style` ga innglidningen
		 * noe å starte fra.
		 */
		const panel = dialog.firstElementChild as HTMLElement;
		await waitFor(() => expect(getComputedStyle(panel).translate).toBe("0px"));

		started.length = 0;
		await userEvent.keyboard("{Escape}");

		await waitFor(() => {
			// Uten hvilestillingen utenfor kanten har translate ingen ny verdi å
			// gå til når `[open]` faller bort, og ingen overgang starter.
			expect(started).toContain("|translate");
			// Bakteppet skal tone ut sammen med panelet, ikke slukke momentant.
			expect(started).toContain("::backdrop|opacity");
		});

		// ...og skuffen skal faktisk bli borte når overgangen er over, ikke bli
		// liggende i topplaget fordi display aldri slår om.
		await waitFor(() => expect(canvas.queryByRole("dialog")).toBeNull());
	},
};

export const Right: Story = {
	args: { side: "right" },
	parameters: ownFrame,
	render: (args) => <OpenDemo {...args} />,
	play: async ({ canvas }) => {
		const dialog = await canvas.findByRole("dialog");

		/*
		 * Vaktpost: dialogen skal ikke være en rullflate.
		 *
		 * Panelet står utenfor kanten det første framet (`starting:group-open:translate-x-full`),
		 * og for right/bottom er det overflow i positiv retning - 400px scrollbart
		 * innhold. Med `overflow: hidden` blir det en ekte rullflate, og showModal()
		 * flytter fokus inn i panelet: nettleseren ruller dialogen dit for å vise
		 * det fokuserte elementet. Da teller scrollposisjonen ned i takt med
		 * animasjonen mens panelet står visuelt stille, og innglidningen uteblir.
		 *
		 * Målt før fiksen: scrollLeft 400→0 mens translate gikk 100%→0, og panelets
		 * x sto bom stille på 880. left/top var upåvirket fordi negativ overflow
		 * ikke er rullbar - derfor står vakten på den siden som faktisk ryker.
		 *
		 * `clip` klipper uten å lage en rullport, så rullingen er umulig.
		 */
		await expect(getComputedStyle(dialog).overflowX).toBe("clip");
		// Fanger feilen direkte hvis den skulle oppstå på en annen måte enn
		// gjennom overflow-verdien. Aldri falsk rød: uten feilen er den alltid 0.
		await expect(dialog.scrollLeft).toBe(0);
	},
};

export const Left: Story = {
	args: { side: "left" },
	parameters: ownFrame,
	render: (args) => <OpenDemo {...args} />,
};

export const Top: Story = {
	args: { side: "top" },
	parameters: ownFrame,
	render: (args) => <OpenDemo {...args} />,
};

export const Bottom: Story = {
	args: { side: "bottom" },
	parameters: ownFrame,
	render: (args) => <OpenDemo {...args} />,
	play: async ({ canvas }) => {
		// Samme vaktpost som i Right, loddrett vei. Målt før fiksen:
		// scrollTop 141→0 mens panelet sto stille på y=659.
		const dialog = await canvas.findByRole("dialog");
		await expect(getComputedStyle(dialog).overflowY).toBe("clip");
		await expect(dialog.scrollTop).toBe(0);
	},
};

export const Small: Story = {
	args: { size: "sm" },
	parameters: ownFrame,
	render: (args) => <OpenDemo {...args} />,
};

export const Medium: Story = {
	args: { size: "md" },
	parameters: ownFrame,
	render: (args) => <OpenDemo {...args} />,
};

export const Large: Story = {
	args: { size: "lg" },
	parameters: ownFrame,
	render: (args) => <OpenDemo {...args} />,
};

export const WithButtonRow: Story = {
	args: {
		footer: (
			<>
				<Button variant="tertiary">Nullstill</Button>
				<Button>Bruk filtre</Button>
			</>
		),
	},
	parameters: ownFrame,
	render: (args) => <OpenDemo {...args} />,
};

export const BackdropDismisses: Story = {
	play: async ({ args, canvas }) => {
		const trigger = canvas.getByRole("button", { name: "Åpne skuffen" });
		await userEvent.click(trigger);

		const dialog = await canvas.findByRole("dialog");
		await userEvent.click(dialog);

		await waitFor(() => expect(canvas.queryByRole("dialog")).toBeNull());
		await expect(args.onClose).toHaveBeenCalledOnce();
		await expect(trigger).toHaveFocus();
	},
};

export const BackdropClickDisabled: Story = {
	args: { closeOnBackdropClick: false },
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Åpne skuffen" }));
		const dialog = await canvas.findByRole("dialog");

		await userEvent.click(dialog);
		await expect(dialog).toBeVisible();
		await expect(args.onClose).not.toHaveBeenCalled();

		// Escape er alltid en vei ut, ellers er dialogen en tastaturfelle.
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(canvas.queryByRole("dialog")).toBeNull());
		await expect(args.onClose).toHaveBeenCalledOnce();
	},
};

export const ScrollingContent: Story = {
	args: {
		children: (
			<div className="flex flex-col gap-4">
				{Array.from({ length: 14 }, (_, i) => (
					<p key={`paragraph-${i + 1}`}>
						Filter {i + 1}. Gjelder alle rapporter i arbeidsområdet, også de som opprettes senere.
					</p>
				))}
			</div>
		),
		footer: <Button>Bruk filtre</Button>,
	},
	play: async ({ canvas }) => {
		// Inter må være byttet inn før noe måles. Med fallback-fonten bryter
		// avsnittene annerledes, og en scrollTop satt på den layouten er ikke
		// lenger bunnen når Inter kommer - sluttilstanden ble tilfeldig, og
		// skjermbildetesten flakset.
		await document.fonts.ready;
		await userEvent.click(canvas.getByRole("button", { name: "Åpne skuffen" }));
		const dialog = await canvas.findByRole("dialog");

		const scrollables = [...dialog.querySelectorAll<HTMLElement>("*")].filter(
			(el) => el.scrollHeight - el.clientHeight > 1 && getComputedStyle(el).overflowY !== "visible",
		);
		// Nøyaktig ett rulleområde: ingen doble rullefelt, og topp og bunn står fast.
		await expect(scrollables).toHaveLength(1);
		const [scrollArea] = scrollables;
		// Et rulleområde uten fokuserbart innhold må kunne nås med tastaturet.
		await expect(scrollArea).toHaveAttribute("tabindex", "0");

		const title = canvas.getByRole("heading", { name: "Filtre" });
		const button = canvas.getByRole("button", { name: "Bruk filtre" });
		const topBefore = title.getBoundingClientRect().top;
		const bottomBefore = button.getBoundingClientRect().top;

		// Bunnen eksplisitt, og assertert på den eksakte verdien: en layout som
		// flytter seg etter rullingen skal bli rød, ikke gi et vilkårlig
		// mellomsteg som sluttilstand.
		const bottom = scrollArea.scrollHeight - scrollArea.clientHeight;
		scrollArea.scrollTop = bottom;
		await waitFor(() => expect(scrollArea.scrollTop).toBe(bottom));

		await expect(title.getBoundingClientRect().top).toBe(topBefore);
		await expect(button.getBoundingClientRect().top).toBe(bottomBefore);
	},
};

export const WithoutTitle: Story = {
	args: {
		title: undefined,
		"aria-label": "Hurtigfiltre",
		children: "Ingen filtre er valgt.",
	},
	parameters: ownFrame,
	render: (args) => <OpenDemo {...args} />,
	play: async ({ canvas }) => {
		const dialog = await canvas.findByRole("dialog");
		await expect(dialog).toHaveAccessibleName("Hurtigfiltre");
	},
};
