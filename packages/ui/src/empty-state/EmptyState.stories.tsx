import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Button } from "../button/Button.tsx";
import { EmptyState } from "./EmptyState.tsx";

const meta: Meta<typeof EmptyState> = {
	title: "Components/EmptyState",
	component: EmptyState,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"Plassholder for lister, søk og innbokser som ikke har noe innhold ennå.\n\n" +
					"Tre deler som alltid henger sammen: et dekorativt ikon, en overskrift som " +
					"sier hva som mangler, og en forklaring som sier hva brukeren kan gjøre " +
					"med det. Som regel også en primærhandling.\n\n" +
					'Teksten skal være konkret. "Ingen data" forteller ingenting - "Ingen ' +
					'varsler ennå. Du er à jour." gjør det.\n\n' +
					"`headingLevel` er en prop fordi overskriften må passe inn i sidens " +
					"nivåer. En tom tilstand inne i et kort under en `h2` skal være `h3`, " +
					"ikke `h2`. Ikonet er `aria-hidden` - det bærer ingen informasjon " +
					"overskriften ikke allerede har.\n\n" +
					"Selve komponenten er statisk. Er `action` en knapp med `onClick`, må " +
					"øya i `apps/web` monteres med `client:visible`, ellers rendres knappen " +
					"som død HTML.",
			},
		},
	},
	tags: ["autodocs"],
	args: {
		title: "Ingen varsler ennå",
		description: "Du er à jour. Nye varsler dukker opp her så snart noe skjer i prosjektene dine.",
	},
	argTypes: {
		tone: {
			control: "inline-radio",
			options: ["brand", "neutral", "success", "warning", "error", "info"],
		},
		headingLevel: { control: "inline-radio", options: [2, 3, 4, 5, 6] },
		className: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { icon: "Bell" },
	play: async ({ canvas }) => {
		const heading = canvas.getByRole("heading", { name: "Ingen varsler ennå", level: 2 });
		// Vaktpost: uten Tailwind er teksten ustilt og kontrastsjekken triviell.
		await expect(getComputedStyle(heading).fontSize).toBe("20px");
		// Ikonflisen er dekorasjon og skal ikke dukke opp i tilgjengelighetstreet.
		await expect(heading.previousElementSibling).toHaveAttribute("aria-hidden", "true");
		await expect(canvas.queryByRole("img")).toBeNull();
	},
};

export const WithAction: Story = {
	args: {
		icon: "Users",
		title: "Ingen medlemmer i teamet",
		description: "Inviter en kollega, så kan dere dele varsler og oppgaver mellom dere.",
		action: <Button leadingIcon="Plus">Inviter kollega</Button>,
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("button", { name: "Inviter kollega" })).toBeVisible();
	},
};

export const NoSearchResults: Story = {
	args: {
		icon: "SearchX",
		tone: "neutral",
		title: "Ingen treff på «kvartalsrapport»",
		description: "Prøv et kortere søkeord, eller fjern filteret på arkiverte dokumenter.",
		action: <Button variant="secondary">Nullstill filter</Button>,
	},
};

export const HeadingLevel: Story = {
	args: { icon: "FileText", headingLevel: 3, title: "Ingen vedlegg", description: undefined },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("heading", { name: "Ingen vedlegg", level: 3 })).toBeVisible();
	},
};

export const Tones: Story = {
	render: (args) => (
		<div className="grid gap-4 md:grid-cols-3">
			<EmptyState {...args} icon="Inbox" title="Merke" tone="brand" />
			<EmptyState {...args} icon="Inbox" title="Nøytral" tone="neutral" />
			<EmptyState {...args} icon="CheckCheck" title="Vellykket" tone="success" />
			<EmptyState {...args} icon="TriangleAlert" title="Advarsel" tone="warning" />
			<EmptyState {...args} icon="CircleX" title="Feil" tone="error" />
			<EmptyState {...args} icon="Info" title="Informasjon" tone="info" />
		</div>
	),
};
