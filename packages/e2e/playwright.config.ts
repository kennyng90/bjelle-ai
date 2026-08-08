import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/*
 * Porten Storybook serveres på. Overstyrbar fordi en etterlatt server fra en
 * avbrutt kjøring ellers blokkerer hele det visuelle prosjektet - og den er en
 * ren Windows-prosess, som `pkill` fra WSL ikke når.
 */
const SB_PORT = process.env.SB_PORT ?? "6008";

/*
 * Playwright starter alle webServer-oppføringer uansett hvilke prosjekter som
 * kjører. Storybook-serveren bygger først, og siden den ikke kan gjenbrukes
 * ville `pnpm test:e2e` både bygget Storybook unødvendig og feilet hvis porten
 * var opptatt. Den tas derfor bare med når det visuelle prosjektet faktisk skal
 * kjøre - som er tilfellet når ingen --project er oppgitt, eller når visuell er
 * blant dem.
 */
const prosjektArgumenter = process.argv.filter((a) => a.startsWith("--project"));
const kjørerVisuell =
	prosjektArgumenter.length === 0 || prosjektArgumenter.some((a) => a.includes("visuell"));
// Merk: fra WSL må variabelen slippes gjennom til Windows-noden:
//   WSLENV=SB_PORT SB_PORT=6022 pnpm exec playwright test --project=visuell

// Én suite, tre konsumenter. @bjelle/ui bygges ikke og SSR-rendres av begge apper,
// så en komponent kan være grønn i Storybook og likevel brekke i en av dem:
// Astro hydrerer den som øy, TanStack Start som del av et SSR-tre. Derfor kjøres
// de samme spesifikasjonene mot begge, i stedet for én suite per app.
//
// Det tredje prosjektet, "visuell", er skjermbildetester mot det bygde
// Storybook. Det er bevisst holdt utenfor standardkjøringen: det bygger
// Storybook først og tar over 360 skjermbilder, og skal ikke ligge i veien for
// den raske tilbakemeldingssløyfa. Kjør det med `pnpm test:visuell`.
export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		trace: "on-first-retry",
	},

	/*
	 * Baseline er operativsystemavhengig. Fontrasterisering skiller seg mellom
	 * Windows og Linux, så samme story gir ulike piksler på din maskin og i en
	 * Linux-CI. Plattformen ligger derfor i stien: de to settene kan leve side
	 * om side, og CI sammenligner mot sitt eget.
	 *
	 * Konsekvens: `--update-snapshots` på Windows oppdaterer bare
	 * win32-baseline. Linux-baseline må genereres der den skal brukes.
	 */
	snapshotPathTemplate: "{testDir}/visuell/__snapshots__/{platform}/{arg}{ext}",

	projects: [
		{
			name: "web",
			testMatch: /apper[\\/].*\.spec\.ts/,
			use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3001" },
		},
		{
			name: "dashboard",
			testMatch: /apper[\\/].*\.spec\.ts/,
			use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" },
		},
		{
			name: "visuell",
			testMatch: /visuell[\\/].*\.spec\.ts/,
			use: {
				...devices["Desktop Chrome"],
				baseURL: `http://localhost:${SB_PORT}`,
				// Fast vindu. Uten det avgjør skjermstørrelsen hvor responsive
				// oppsett brekker, og baseline blir maskinavhengig.
				viewport: { width: 1280, height: 720 },
				// Deterministisk rendering på tvers av maskiner med ulik DPI.
				deviceScaleFactor: 1,
			},
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
		...(kjørerVisuell
			? [
					{
						// Bygger før servering. Serveres et gammelt storybook-static, tester
						// vi forrige commits utseende og får grønt på en ekte regresjon.
						command: `pnpm --filter @bjelle/designsystem build && pnpm exec node ${JSON.stringify(path.join(dirname, "scripts/serve-storybook.mjs"))} ${SB_PORT}`,
						url: `http://localhost:${SB_PORT}/index.json`,
						/*
						 * Aldri gjenbruk. Kommandoen bygger Storybook før den serverer, og
						 * `reuseExistingServer` hopper over hele kommandoen når porten
						 * svarer - altså også bygget. Da sammenlignes dagens kode mot
						 * forrige builds utseende, og suiten er grønn på en ekte regresjon.
						 *
						 * Dette skjedde: to kjøringer på rad ga eksakt samme 38 feil, og
						 * de reelle 58 dukket først opp da storybook-static ble slettet.
						 *
						 * Prisen er at porten må være ledig. Ligger det en server igjen fra
						 * en avbrutt kjøring, kjør med `SB_PORT=6018` - eller finn den med
						 * `netstat.exe -ano | grep 6008` og stopp den Windows-side.
						 */
						reuseExistingServer: false,
						timeout: 300_000,
					},
				]
			: []),
	],
});
