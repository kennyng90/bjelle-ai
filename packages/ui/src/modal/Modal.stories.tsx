import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { Button } from "../button/Button.tsx";
import { Modal, type ModalProps } from "./Modal.tsx";

type DemoProps = Omit<ModalProps, "open">;

/**
 * Modal er kontrollert. Storyene eier `open`, akkurat som en app ville gjort.
 * `startOpen` gir dokumentasjonssidene en variant som viser innholdet uten at
 * noen må klikke først.
 */
function makeDemo(startOpen: boolean) {
	return function Demo({ onClose, ...args }: DemoProps) {
		const [open, setOpen] = useState(startOpen);
		return (
			<>
				<Button onClick={() => setOpen(true)}>Åpne dialogen</Button>
				<Modal
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

/**
 * Mange apper rendrer dialogen betinget i stedet for å la den ligge lukket.
 * Da forsvinner <dialog> fra DOM mens den står åpen, og nettleseren har ingen
 * dialog å gi fokus tilbake fra.
 */
function RemovableDemo({ onClose, ...args }: DemoProps) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button onClick={() => setOpen(true)}>Åpne dialogen</Button>
			{open && (
				<Modal
					{...args}
					onClose={() => {
						setOpen(false);
						onClose();
					}}
					open
				/>
			)}
		</>
	);
}

/** Bekreftelser trenger knapper i bunnen som faktisk lukker dialogen. */
function ConfirmationDemo({ onClose, ...args }: DemoProps) {
	const [open, setOpen] = useState(false);
	const close = () => {
		setOpen(false);
		onClose();
	};

	return (
		<>
			<Button onClick={() => setOpen(true)} variant="destructive">
				Slett rapporten
			</Button>
			<Modal
				{...args}
				closeOnBackdropClick={false}
				footer={
					<>
						<Button onClick={close} variant="tertiary">
							Avbryt
						</Button>
						<Button onClick={close} variant="destructive">
							Ja, slett
						</Button>
					</>
				}
				onClose={close}
				open={open}
			/>
		</>
	);
}

/** Stories som starter åpne får sin egen iframe i autodocs. Uten det ville
 * dialogen ligge i topplaget og dekke hele dokumentasjonssiden. */
const ownFrame = { docs: { story: { inline: false, iframeHeight: 420 } } };

const meta: Meta<typeof Modal> = {
	title: "Components/Modal",
	component: Modal,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: {
		title: "Inviter en kollega",
		description: "Vi sender en e-post med lenke til arbeidsområdet.",
		children:
			"Personen får tilgang til alle rapporter i arbeidsområdet. Du kan fjerne tilgangen igjen når som helst.",
		onClose: fn(),
	},
	argTypes: {
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
		const trigger = canvas.getByRole("button", { name: "Åpne dialogen" });
		await userEvent.click(trigger);

		const dialog = await canvas.findByRole("dialog");
		await expect(dialog).toHaveAccessibleName("Inviter en kollega");
		await expect(dialog).toHaveAccessibleDescription(
			"Vi sender en e-post med lenke til arbeidsområdet.",
		);

		// Vaktpost: uten Tailwind i testoppsettet er alt ustilt, og enhver
		// kontrastsjekk består trivielt.
		await expect(getComputedStyle(dialog).position).toBe("fixed");

		// :modal er sann kun for dialoger åpnet med showModal(). Det er beviset
		// på at nettleseren har fokusfelle, inert bakgrunn og topplag - noe
		// syntetiske Tab-trykk fra user-event ikke kan måle.
		await expect(dialog.matches(":modal")).toBe(true);

		// Fokus skal ha flyttet seg inn i dialogen ved åpning.
		await expect(dialog).toContainElement(document.activeElement as HTMLElement);

		await userEvent.keyboard("{Escape}");

		// Lukket dialog skal ikke finnes i tilgjengelighetstreet.
		await waitFor(() => expect(canvas.queryByRole("dialog")).toBeNull());
		await expect(args.onClose).toHaveBeenCalledOnce();
		await expect(trigger).toHaveFocus();
	},
};

export const Open: Story = {
	parameters: ownFrame,
	render: (args) => <OpenDemo {...args} />,
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
	parameters: ownFrame,
	args: {
		footer: (
			<>
				<Button variant="tertiary">Avbryt</Button>
				<Button>Send invitasjon</Button>
			</>
		),
	},
	render: (args) => <OpenDemo {...args} />,
};

export const BackdropDismisses: Story = {
	play: async ({ args, canvas }) => {
		const trigger = canvas.getByRole("button", { name: "Åpne dialogen" });
		await userEvent.click(trigger);

		const dialog = await canvas.findByRole("dialog");
		// Klikk i kanten av dialogen, altså på bakteppet utenfor panelet.
		await userEvent.click(dialog);

		await waitFor(() => expect(canvas.queryByRole("dialog")).toBeNull());
		await expect(args.onClose).toHaveBeenCalledOnce();
		await expect(trigger).toHaveFocus();
	},
};

export const Destructive: Story = {
	args: {
		title: "Slett rapporten?",
		description: "Rapporten og alle delte lenker forsvinner.",
		children: "Dette kan ikke angres.",
	},
	render: (args) => <ConfirmationDemo {...args} />,
	play: async ({ args, canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Slett rapporten" }));
		const dialog = await canvas.findByRole("dialog");

		// closeOnBackdropClick er av: et uhellsklikk skal ikke kunne avbryte en
		// destruktiv bekreftelse.
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
				{Array.from({ length: 12 }, (_, i) => (
					<p key={`paragraph-${i + 1}`}>
						Avsnitt {i + 1}. Tilgangen gjelder alle rapporter i arbeidsområdet, også de som
						opprettes senere.
					</p>
				))}
			</div>
		),
		footer: <Button>Send invitasjon</Button>,
	},
	play: async ({ canvas }) => {
		// Inter må være byttet inn før noe måles. Med fallback-fonten bryter
		// avsnittene annerledes, og en scrollTop satt på den layouten er ikke
		// lenger bunnen når Inter kommer - sluttilstanden ble tilfeldig, og
		// skjermbildetesten flakset.
		await document.fonts.ready;
		await userEvent.click(canvas.getByRole("button", { name: "Åpne dialogen" }));
		const dialog = await canvas.findByRole("dialog");

		const scrollables = [...dialog.querySelectorAll<HTMLElement>("*")].filter(
			(el) => el.scrollHeight - el.clientHeight > 1 && getComputedStyle(el).overflowY !== "visible",
		);
		// Nøyaktig ett rulleområde: ingen doble rullefelt, og topp og bunn står fast.
		await expect(scrollables).toHaveLength(1);
		const [scrollArea] = scrollables;
		// Et rulleområde uten fokuserbart innhold må kunne nås med tastaturet.
		await expect(scrollArea).toHaveAttribute("tabindex", "0");

		const title = canvas.getByRole("heading", { name: "Inviter en kollega" });
		const button = canvas.getByRole("button", { name: "Send invitasjon" });
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
		description: undefined,
		"aria-label": "Kort beskjed",
		children: "Invitasjonen er sendt.",
	},
	parameters: ownFrame,
	render: (args) => <OpenDemo {...args} />,
	play: async ({ canvas }) => {
		const dialog = await canvas.findByRole("dialog");
		await expect(dialog).toHaveAccessibleName("Kort beskjed");
	},
};

export const WithoutCloseButton: Story = {
	args: {
		title: undefined,
		description: undefined,
		"aria-label": "Kort beskjed",
		children: "Invitasjonen er sendt. Trykk Escape for å lukke.",
		showCloseButton: false,
	},
	play: async ({ args, canvas }) => {
		const trigger = canvas.getByRole("button", { name: "Åpne dialogen" });
		await userEvent.click(trigger);
		const dialog = await canvas.findByRole("dialog");

		// Ingen fokuserbare elementer inni: da skal fokus lande på dialogen selv,
		// ikke bli stående igjen på utløseren bak.
		await expect(dialog).toHaveFocus();

		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(canvas.queryByRole("dialog")).toBeNull());
		await expect(args.onClose).toHaveBeenCalledOnce();
		await expect(trigger).toHaveFocus();
	},
};

export const Removed: Story = {
	render: (args) => <RemovableDemo {...args} />,
	play: async ({ canvas }) => {
		const trigger = canvas.getByRole("button", { name: "Åpne dialogen" });
		await userEvent.click(trigger);
		await canvas.findByRole("dialog");

		await userEvent.keyboard("{Escape}");

		await waitFor(() => expect(canvas.queryByRole("dialog")).toBeNull());
		// Dialogen er borte fra DOM, ikke bare lukket.
		await expect(document.querySelector("dialog")).toBeNull();
		await expect(trigger).toHaveFocus();
	},
};
