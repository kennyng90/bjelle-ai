import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Page, Section, Tile } from "./layout.tsx";

/**
 * Fargene i designsystemet, lest rett fra tokenene. Bytt tema i
 * verktøylinja for å se hvilke roller som snur.
 *
 * Rekkefølgen følger hvordan man velger: først flaten noe ligger på, så
 * fyllet, så teksten oppå, så kanten rundt.
 */
const meta: Meta = {
	title: "Foundations/Colors",
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

const SURFACES = [
	"bg-background-base",
	"bg-background-raised",
	"bg-background-sunken",
	"bg-background-alternate",
	"bg-background-overlay",
	"bg-background-inverse",
	"bg-background-brand",
];

const FILL_STRONG = [
	"bg-fill-brand-strong",
	"bg-fill-error-strong",
	"bg-fill-success-strong",
	"bg-fill-warning-strong",
	"bg-fill-information-strong",
	"bg-fill-strong",
];

const FILL_WEAK = [
	"bg-fill-brand-weak",
	"bg-fill-error-weak",
	"bg-fill-success-weak",
	"bg-fill-warning-weak",
	"bg-fill-information-weak",
	"bg-fill-weak",
];

const TEXT = [
	"text-text-strong",
	"text-text-weak",
	"text-text-brand",
	"text-text-error",
	"text-text-success",
	"text-text-warning",
	"text-text-information",
];

const BORDERS = [
	"border-stroke-weak",
	"border-stroke-strong",
	"border-stroke-stronger",
	"border-stroke-focus",
	"border-stroke-brand-weak",
	"border-stroke-error-weak",
];

function Content() {
	return (
		<Page>
			<Section
				title="Flater"
				description="Grunnen sidene står på. base er hvit, sunken er appens lerret, inverse brukes til CTA-band, toaster og tooltips."
			>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
					{SURFACES.map((k) => (
						<Tile key={k} className={k} name={k} framed />
					))}
				</div>
			</Section>

			<Section
				title="Fyll, sterke"
				description="Bærer knapper og markeringer. Tekst oppå disse skal alltid være text-text-on-strong - den snur i mørkt tema, der flatene blir lyse."
			>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
					{FILL_STRONG.map((k) => (
						<Tile key={k} className={k} name={k} />
					))}
				</div>
			</Section>

			<Section
				title="Fyll, svake"
				description="Tonale bakgrunner for merkelapper og varselbokser. Svært lave metninger - de er ment å bære farget tekst, ikke å synes selv."
			>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
					{FILL_WEAK.map((k) => (
						<Tile key={k} className={k} name={k} framed />
					))}
				</div>
			</Section>

			<Section
				title="Tekst"
				description="Rollene for tekstfarge, vist på gjeldende flate. Alle holder 4.5:1 mot underlaget i begge temaer."
			>
				<ul className="space-y-2">
					{TEXT.map((k) => (
						<li key={k} className={`text-body ${k}`}>
							Børsmeldinger, forklart som om du var ny.{" "}
							<code className="font-mono text-tiny">{k}</code>
						</li>
					))}
				</ul>
			</Section>

			<Section
				title="Deaktivert tekst"
				description="text-text-disabled ligger på 3.06:1 og er den ene rollen som ikke når 4.5:1. Det er med vilje: WCAG 1.4.3 unntar tekst i inaktive kontroller, og en deaktivert knapp må se deaktivert ut. Rollen skal derfor bare brukes på noe som faktisk er disabled - som vanlig brødtekst er den et brudd."
			>
				<button
					className="rounded-8 border border-stroke-disabled px-4 py-2 font-strong text-body text-text-disabled"
					disabled
					type="button"
				>
					Følg selskapet
				</button>
			</Section>

			<Section
				title="Kantlinjer"
				description="1px hårstrek er standard. stroke-weak er dekor; er kanten det eneste som viser hvor en kontroll begynner, bruk stroke-strong. stroke-focus er fokusringen og skal aldri brukes til noe annet."
			>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
					{BORDERS.map((k) => (
						<div key={k} className="flex flex-col gap-2">
							<div className={`h-16 rounded-8 border-2 ${k}`} />
							<code className="font-mono text-tiny text-text-weak">{k}</code>
						</div>
					))}
				</div>
			</Section>
		</Page>
	);
}

export const Light: Story = {
	name: "Colors",
	render: () => <Content />,
};

/**
 * Mørkt tema som egen story, ikke bare bak temabryteren: da kjører axe
 * kontrastsjekken mot de mørke verdiene også, og et brudd som bare finnes i
 * mørkt tema feiler bygget.
 *
 * `!dev` holder den ute av sidemenyen - dette er en test, ikke en side å bla
 * i. Vil du se paletten i mørkt tema, bruk temabryteren i verktøylinja.
 *
 * Taggene må stå her som literal. Storybooks indekser leser dem statisk og
 * ser ikke inn i et spredt objekt.
 */
export const Dark: Story = {
	name: "Colors (dark theme)",
	tags: ["!dev", "!autodocs"],
	globals: { theme: "dark" },
	render: () => <Content />,
	play: async () => {
		// Vaktpost: uten denne kunne den mørke storyen bestått axe fordi den
		// aldri ble mørk. Rollen skal peke på grey-solid-900, ikke hvitt.
		const surface = getComputedStyle(document.documentElement)
			.getPropertyValue("--background-base")
			.trim();
		await expect(surface).toBe("rgb(18, 19, 26)");
	},
};
