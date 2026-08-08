import { defineConfig, devices } from "@playwright/test";

// Én suite, to konsumenter. @bjelle/ui bygges ikke og SSR-rendres av begge apper,
// så en komponent kan være grønn i Storybook og likevel brekke i en av dem:
// Astro hydrerer den som øy, TanStack Start som del av et SSR-tre. Derfor kjøres
// de samme spesifikasjonene mot begge, i stedet for én suite per app.
export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "web",
			use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3001" },
		},
		{
			name: "dashboard",
			use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" },
		},
	],
	// Verktøykjeden er Windows under WSL. Kommandoene må gå via pnpm; bart node
	// finnes ikke på PATH. Se packages/ui/CLAUDE.md.
	webServer: [
		{
			command: "pnpm --filter @bjelle/web dev",
			url: "http://localhost:3001",
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
		},
		{
			command: "pnpm --filter @bjelle/dashboard dev",
			url: "http://localhost:3000",
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
		},
	],
});
