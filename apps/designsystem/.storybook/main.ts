import type { StorybookConfig } from "@storybook/react-vite";

// Designsystemet eier ingen komponenter. Det er visningsflaten for @bjelle/ui,
// og henter stories derfra slik at story og komponent ligger side om side.
const config: StorybookConfig = {
	stories: ["../../../packages/ui/src/**/*.stories.@(ts|tsx)"],
	addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-vitest"],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
};

export default config;
