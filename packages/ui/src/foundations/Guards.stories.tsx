import { composeStories, type Meta, type StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import * as radioStories from "../radio/Radio.stories.tsx";

/**
 * Regresjonsvakter, ikke dokumentasjon.
 *
 * Alt her er tagget `!dev`, så det vises ikke i sidemenyen - men det kjøres
 * som tester på lik linje med alt annet. Dette er invarianter som ryker stille
 * hvis noen flytter en import eller endrer et oppsett, uten at noen komponent
 * ser feil ut før en bruker sitter fast.
 */
const meta: Meta = {
	title: "Foundations/Guards",
	tags: ["!dev", "!autodocs"],
	parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj;

/**
 * Tailwinds `transition-colors` inkluderer `outline-color`. Med fokusringer på
 * alt interaktivt betyr det at ringen toner inn over 180ms og ikke er der i
 * det øyeblikket fokus lander. `packages/ui/styles.css` overstyrer utilityen i
 * `@layer utilities`, og den overstyringen avhenger av kilderekkefølge:
 * flyttes importen, eller byttes den mot `@utility`, ryker den stille.
 */
export const FocusRingDoesNotFadeIn: Story = {
	name: "Focus ring does not fade in",
	render: () => (
		<button className="transition-colors hover:bg-fill-hover" type="button">
			Sonde
		</button>
	),
	play: async ({ canvas }) => {
		const transition = getComputedStyle(canvas.getByRole("button")).transitionProperty;
		await expect(transition).not.toContain("outline-color");
		// Kontrollprøve: uten denne ville en tom transition-property bestå.
		await expect(transition).toContain("background-color");
	},
};

/**
 * Tailwinds standardpalett og typeskala er slått av i tokenfila. Kommer de
 * tilbake, finnes det plutselig to fargesystemer der bare det ene snur i
 * mørkt tema - og ingen komponent feiler av det.
 */
export const DefaultPaletteIsOff: Story = {
	name: "Tailwind defaults are off",
	render: () => (
		<div>
			<span className="bg-red-500 text-xl" data-testid="default">
				Skal være ustilt
			</span>
			<span className="bg-fill-brand-strong text-h4 text-text-on-strong" data-testid="token">
				Skal være stilt
			</span>
		</div>
	),
	play: async ({ canvas }) => {
		// Positiv kontroll først. Uten den ville hele denne storyen bestått
		// trivielt hvis Tailwind falt ut av testoppsettet - da er jo ingenting
		// stilt, inkludert bg-red-500.
		const token = getComputedStyle(canvas.getByTestId("token"));
		await expect(token.backgroundColor).toBe("rgb(76, 100, 217)");
		await expect(token.fontSize).toBe("20px");

		const fallback = getComputedStyle(canvas.getByTestId("default"));
		await expect(fallback.backgroundColor).toBe("rgba(0, 0, 0, 0)");
		// text-xl finnes ikke; da arves brødtekststørrelsen fra preview.
		await expect(fallback.fontSize).not.toBe("20px");
	},
};

/*
 * Vakten under trenger alle Radio-storyene i ett og samme dokument, slik
 * autodocs-siden rendrer dem. `composeStories` gir dem med args, decorators og
 * alt fra meta påsatt - men uten play-funksjoner, som er poenget: det er
 * markupen side om side som skal måles.
 */
const composedRadioStories = Object.entries(composeStories(radioStories));

/**
 * En autodocs-side rendrer samtlige stories for en komponent i samme dokument.
 * `<input type="radio">` grupperes av `name` på tvers av hele dokumentet, så to
 * stories som deler `name` smelter sammen til én gruppe: bare den siste
 * forhåndsvalgte knappen overlever, og alle tidligere slås av. Isolert
 * story-canvas - og dermed hver enkelt play-funksjon - ser det aldri, for der
 * er storyen alene i dokumentet.
 *
 * Vakten setter storyene ved siden av hverandre og krever at hver gruppe
 * beholder sitt eget valg, og at ingen `name` går på tvers av to stories.
 */
export const RadioGroupsDoNotLeakAcrossDocs: Story = {
	name: "Radio groups do not leak across a docs page",
	parameters: { layout: "padded" },
	render: () => (
		<div className="flex flex-col gap-6">
			{composedRadioStories.map(([exportName, Story]) => (
				<div data-story={exportName} key={exportName}>
					<Story />
				</div>
			))}
		</div>
	),
	play: async ({ canvas }) => {
		const radios = canvas.getAllByRole<HTMLInputElement>("radio");

		// Positiv kontroll: uten forhåndsvalgte knapper måler resten ingenting.
		const preselected = radios.filter((radio) => radio.defaultChecked);
		await expect(preselected.length).toBeGreaterThan(2);

		for (const radio of preselected) {
			const story = radio.closest("[data-story]")?.getAttribute("data-story");
			// Meldingen navngir storyen, ellers står man igjen med "expected false".
			await expect(radio, `${story}: ${radio.value} mistet valget sitt`).toBeChecked();
		}

		const owners = new Map<string, Set<string>>();
		for (const radio of radios) {
			const story = radio.closest("[data-story]")?.getAttribute("data-story") ?? "?";
			// Uten navn grupperes knappen ikke i det hele tatt, og da kan brukeren
			// velge alle alternativene samtidig.
			await expect(radio.name, `${story}: radioknapp uten name`).not.toBe("");
			const seen = owners.get(radio.name) ?? new Set<string>();
			seen.add(story);
			owners.set(radio.name, seen);
		}
		for (const [radioName, stories] of owners) {
			await expect([...stories], `name="${radioName}" deles av flere stories`).toHaveLength(1);
		}
	},
};
