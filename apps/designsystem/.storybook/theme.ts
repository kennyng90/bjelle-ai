import { create } from "storybook/theming";

/*
 * Storybook-temaer bygget av våre egne tokenverdier.
 *
 * Brukes av manager.ts til å farge sidebaren og toppmenyen. Manager-UI-et er
 * et eget dokument utenfor preview-iframen, så det kan verken nå designtokenene
 * våre eller følge tema-velgeren - den globalen lever på den andre siden.
 *
 * Verdiene er hentet fra @bjelle/tokens. De må skrives som literaler her -
 * emotion regner på fargene (blander, lysner) og kan ikke ta imot var().
 * Derfor er dette den ene filen i repoet der rå hex er riktig. Endres
 * primitivene i tokenfila, må disse følge etter.
 */

const shared = {
	fontBase: '"Inter Variable", "Inter", ui-sans-serif, system-ui, sans-serif',
	fontCode: '"Menlo", "SF Mono", ui-monospace, Consolas, monospace',
	brandTitle: "Bjelle designsystem",
	appBorderRadius: 8,
};

export const lightTheme = create({
	...shared,
	base: "light",
	// --background-base / --background-sunken
	appBg: "#ffffff",
	appContentBg: "#ffffff",
	appPreviewBg: "#ffffff",
	// --blue-light-1000
	colorPrimary: "#4c64d9",
	colorSecondary: "#4c64d9",
	// --grey-light-1000 og --grey-light-700, flatet ut mot hvit
	textColor: "#1a1f33",
	textMutedColor: "#595f7a",
	textInverseColor: "#ffffff",
	// --grey-light-100 flatet ut mot hvit
	appBorderColor: "#e5e7f0",
	barBg: "#ffffff",
	barTextColor: "#595f7a",
	barSelectedColor: "#4c64d9",
	inputBg: "#ffffff",
	inputBorder: "#c7cbdd",
	inputTextColor: "#1a1f33",
});

export const darkTheme = create({
	...shared,
	base: "dark",
	// --grey-solid-900 / --grey-solid-850 / --grey-solid-1000
	appBg: "#12131a",
	appContentBg: "#12131a",
	appPreviewBg: "#1d1e26",
	// --blue-dark-1000
	colorPrimary: "#a3b2ff",
	colorSecondary: "#a3b2ff",
	// --grey-dark-1000 og --grey-dark-700, flatet ut mot #12131a
	textColor: "#ffffff",
	textMutedColor: "#c4c5c9",
	textInverseColor: "#12131a",
	// --grey-dark-100 flatet ut mot #12131a
	appBorderColor: "#2e2f36",
	barBg: "#1d1e26",
	barTextColor: "#c4c5c9",
	barSelectedColor: "#a3b2ff",
	inputBg: "#1d1e26",
	inputBorder: "#3a3b42",
	inputTextColor: "#ffffff",
});
