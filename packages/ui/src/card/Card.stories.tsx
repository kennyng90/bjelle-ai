import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { Button } from "../button/Button.tsx";
import { Card, CardLink } from "./Card.tsx";

function Report() {
	return (
		<>
			<h3 className="text-h4 font-strong text-text-strong">Kvartalsrapport</h3>
			<p className="mt-2 text-body text-text-weak">
				Omsetningen økte i alle tre markedene. Tallene er foreløpige fram til regnskapet er
				avsluttet.
			</p>
		</>
	);
}

const meta: Meta<typeof Card> = {
	title: "Components/Card",
	component: Card,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { children: <Report />, className: "max-w-96" },
	argTypes: {
		variant: { control: "inline-radio", options: ["raised", "outlined", "flat"] },
		padding: { control: "inline-radio", options: ["none", "sm", "md", "lg"] },
		// Arvet fra HTMLAttributes. Ikke noe designeren skal skru på.
		role: { table: { disable: true } },
		tabIndex: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

/*
 * Løftet ligger bak `motion-safe`, og den visuelle regresjonssuiten kjører med
 * `prefers-reduced-motion: reduce` for å fryse animasjoner. Uten denne vakta
 * feiler play-funksjonen der, og skjermbildet fanger tilstanden midt i en
 * avbrutt play - en baseline som ikke viser noe noen har bestemt.
 */
async function expectLift(card: HTMLElement) {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		// Redusert bevegelse: kortet skal stå stille. Skyggen bytter fortsatt.
		await expect(getComputedStyle(card).translate).toBe("none");
		return;
	}
	await waitFor(async () => {
		await expect(getComputedStyle(card).translate).toBe("0px -2px");
	});
}

/** Henter kortflaten via overskriften, som er et direkte barn av kortet. */
function surface(element: HTMLElement) {
	const parent = element.parentElement;
	if (!parent) throw new Error("Fant ikke kortflaten");
	return parent;
}

export const Default: Story = {
	play: async ({ canvas }) => {
		const card = surface(canvas.getByRole("heading", { name: "Kvartalsrapport" }));
		const style = getComputedStyle(card);
		// Vaktpost, ikke en test av kortet: fanger at Tailwind har falt ut av
		// testoppsettet. Uten stiler består enhver kontrastsjekk trivielt.
		await expect(style.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
		// Grunnflaten i systemet: radius 16, shadow-md, 24 px luft.
		await expect(style.borderRadius).toBe("16px");
		await expect(style.padding).toBe("24px");
		await expect(style.boxShadow).not.toBe("none");
	},
};

export const Outlined: Story = {
	args: { variant: "outlined" },
	play: async ({ canvas }) => {
		const style = getComputedStyle(
			surface(canvas.getByRole("heading", { name: "Kvartalsrapport" })),
		);
		// Hårstreken er en innvendig ring, ikke en kant: den skal ikke spise av
		// innholdsboksen og skyve teksten i forhold til et hevet nabokort.
		await expect(style.borderTopWidth).toBe("0px");
		await expect(style.boxShadow).toContain("inset");
	},
};

export const Flat: Story = {
	args: { variant: "flat" },
	decorators: [
		(Story) => (
			<div className="rounded-20 bg-background-sunken p-8">
				<Story />
			</div>
		),
	],
	play: async ({ canvas }) => {
		const style = getComputedStyle(
			surface(canvas.getByRole("heading", { name: "Kvartalsrapport" })),
		);
		await expect(style.borderTopWidth).toBe("0px");
		await expect(style.boxShadow).toBe("none");
	},
};

export const Variants: Story = {
	parameters: { layout: "padded" },
	render: (args) => (
		<div className="grid gap-4 rounded-20 bg-background-sunken p-8 sm:grid-cols-3">
			<Card {...args} className="" variant="raised">
				<p className="text-body text-text-strong">Hevet</p>
			</Card>
			<Card {...args} className="" variant="outlined">
				<p className="text-body text-text-strong">Utlinjet</p>
			</Card>
			<Card {...args} className="" variant="flat">
				<p className="text-body text-text-strong">Flat</p>
			</Card>
		</div>
	),
};

export const Padding: Story = {
	parameters: { layout: "padded" },
	render: (args) => (
		<div className="grid gap-4 sm:grid-cols-4">
			<Card {...args} className="" padding="none">
				<p className="text-body text-text-strong">Ingen</p>
			</Card>
			<Card {...args} className="" padding="sm">
				<p className="text-body text-text-strong">Liten</p>
			</Card>
			<Card {...args} className="" padding="md">
				<p className="text-body text-text-strong">Middels</p>
			</Card>
			<Card {...args} className="" padding="lg">
				<p className="text-body text-text-strong">Stor</p>
			</Card>
		</div>
	),
};

export const LinkCard: Story = {
	args: { href: "#kvartalsrapport", interactive: true },
	play: async ({ canvas }) => {
		const card = canvas.getByRole("link", { name: /Kvartalsrapport/ });
		await expect(card.tagName).toBe("A");
		await userEvent.tab();
		await expect(card).toHaveFocus();
		// Fokusringen må være synlig, ikke bare underforstått.
		await expect(getComputedStyle(card).outlineWidth).toBe("2px");
		// Løftet ligger på `translate`, ikke `transform`, i Tailwind 4, og gjelder
		// tastaturfokus like mye som peker.
		await expectLift(card);
	},
};

export const MultipleLinks: Story = {
	args: {
		interactive: true,
		className: "max-w-96 kort-under-test",
		children: (
			<>
				<h3 className="text-h4 font-strong text-text-strong">
					<CardLink href="#kvartalsrapport">Kvartalsrapport</CardLink>
				</h3>
				<p className="mt-2 text-body text-text-weak">
					Omsetningen økte i alle tre markedene. Tallene er foreløpige.
				</p>
				<a
					className="relative z-10 mt-4 inline-block w-fit text-small font-medium text-text-brand underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus"
					href="#markedstall"
				>
					Se markedstall
				</a>
			</>
		),
	},
	play: async ({ canvas, canvasElement }) => {
		const card = canvasElement.querySelector<HTMLElement>(".kort-under-test");
		if (!card) throw new Error("Fant ikke kortflaten");
		const title = canvas.getByRole("link", { name: "Kvartalsrapport" });

		await userEvent.tab();
		await expect(title).toHaveFocus();

		const overlay = getComputedStyle(title, "::after");
		// Overlegget skal dekke hele kortflaten, ikke bare tittelen.
		await expect(parseFloat(overlay.height)).toBeCloseTo(card.getBoundingClientRect().height, 0);
		// ... og fokusringen tegnes på overlegget, slik at den rammer inn kortet.
		await expect(overlay.outlineWidth).toBe("2px");

		// Hovedlenken løfter kortet, fordi det er kortet som er målet.
		await expectLift(card);

		// Den andre lenken ligger over overlegget og er sin egen tabstopp. Den
		// peker et annet sted, og da skal ikke kortet løfte seg.
		await userEvent.tab();
		await expect(canvas.getByRole("link", { name: "Se markedstall" })).toHaveFocus();
		await waitFor(async () => {
			await expect(getComputedStyle(card).translate).toBe("none");
		});
	},
};

export const WithAction: Story = {
	args: {
		children: (
			<>
				<Report />
				<div className="mt-6 flex gap-3">
					<Button size="sm">Last ned</Button>
					<Button size="sm" variant="secondary">
						Del
					</Button>
				</div>
			</>
		),
	},
	play: async ({ canvas }) => {
		await userEvent.tab();
		await expect(canvas.getByRole("button", { name: "Last ned" })).toHaveFocus();
	},
};
