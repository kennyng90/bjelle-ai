import type { StorybookConfig } from "@storybook/react-vite";

// Designsystemet eier ingen komponenter. Det er visningsflaten for @bjelle/ui,
// og henter stories derfra slik at story og komponent ligger side om side.
const config: StorybookConfig = {
	stories: ["../../../packages/ui/src/**/*.stories.@(ts|tsx)"],
	addons: [
		"@storybook/addon-docs",
		"@storybook/addon-a11y",
		"@storybook/addon-vitest",
		/*
		 * Temabryteren. Den eier både manager-UI-et (sidebar, toppmeny) og
		 * preview-en, som er to ulike dokumenter - det er hele grunnen til at
		 * den er her framfor en egen global. En global lever bare på
		 * preview-siden og kan ikke nå sidebaren.
		 */
		"storybook-dark-mode",
	],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
};

export default config;
