import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

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
