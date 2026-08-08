import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/*
 * Visuell regresjon over hele designsystemet.
 *
 * Dette dekker hullet ingen av de andre testene ser. Axe fanger kontrast og
 * semantikk, play-funksjonene fanger oppførsel - men ingen av dem merker at en
 * skilleringen er oval, at fokusringen klippes av en rullecontainer, eller at
 * sorteringsikonet står på feil side av en høyrestilt kolonne. Alle tre var
 * ekte feil i denne porten, og alle tre ble funnet med skjermbilder.
 *
 * Story-lista leses fra Storybooks egen index.json, ikke fra en håndskrevet
 * liste. En ny komponent får dermed visuell dekning i det den får en story.
 */

type Entry = {
	id: string;
	title: string;
	name: string;
	type: string;
	tags?: string[];
};

const index = JSON.parse(
	readFileSync(
		fileURLToPath(
			new URL("../../../../apps/designsystem/storybook-static/index.json", import.meta.url),
		),
		"utf8",
	),
) as { entries: Record<string, Entry> };

const stories = Object.values(index.entries).filter((e) => e.type === "story");

if (stories.length === 0) {
	throw new Error("index.json inneholder ingen stories - er Storybook bygget?");
}

/*
 * Stories som ikke kan stabilisere seg, med grunn.
 *
 * Playwright tar skjermbilder om igjen til to på rad er like, så det meste
 * ordner seg selv. Disse gjør det ikke, og da er et ustabilt skjermbilde verre
 * enn ingen: det lærer folk å ignorere røde visuelle tester.
 */
const UNSTABLE = new Map<string, string>([
	// Toasten teller ned og forsvinner. Sluttilstanden er en tom side, som er
	// verdiløs å sammenligne. Auto-lukkingen er dekket av play-funksjoner.
	["components-toast--auto-dismiss-pauses-on-hover", "teller ned og forsvinner"],
	["components-toast--auto-dismiss-pauses-on-focus", "teller ned og forsvinner"],
]);

test.describe("Visuell regresjon", () => {
	for (const story of stories) {
		const skipReason = UNSTABLE.get(story.id);
		const name = `${story.title} - ${story.name}`;

		// eslint-disable-next-line playwright/valid-title
		test(name, async ({ page }) => {
			test.skip(Boolean(skipReason), skipReason);

			/*
			 * Skjermbilder skal fange layout og farge, ikke tilfeldig timing.
			 * `animations: "disabled"` i toHaveScreenshot fryser CSS-animasjoner,
			 * men slår ikke på komponentenes egne motion-reduce-varianter. Det
			 * gjør denne.
			 *
			 * Satt her og ikke i prosjektkonfigurasjonen: `reducedMotion` finnes
			 * ikke i UseOptions-typene i denne Playwright-versjonen.
			 */
			await page.emulateMedia({ reducedMotion: "reduce" });

			await page.goto(`/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`);

			// Storybook tegner inn i #storybook-root. Uten denne kan vi treffe
			// et tomt dokument før rammeverket har rukket å montere noe.
			await page.locator("#storybook-root").waitFor({ state: "attached" });
			await expect
				.poll(() => page.locator("#storybook-root > *, #storybook-root dialog").count(), {
					message: `storyen "${story.id}" tegnet aldri noe`,
					timeout: 15_000,
				})
				.toBeGreaterThan(0);

			// Inter lastes som webfont. Skytes bildet før fonten er byttet inn,
			// blir baseline tatt med fallback-fonten og alt spriker etterpå.
			await page.evaluate(() => document.fonts.ready);

			await expect(page).toHaveScreenshot(`${story.id}.png`, {
				fullPage: true,
				/*
				 * Null slingringsmonn. Begge tallene må stå på 0.
				 *
				 * Playwright sammenligner med pixelmatch, som gjør to ting før
				 * den teller: den avviser piksler under en perseptuell grense
				 * (`threshold`), og den hopper helt over piksler den mener er
				 * kantutjevning. En tynn ikonstrek er nesten bare kantutjevning,
				 * så den forsvinner i begge filtrene.
				 *
				 * Målt i denne porten: loading-ikonet byttet fra åtte eiker til
				 * én bue ga 168 avvikende piksler med fullt kanalutslag - og
				 * suiten var grønn på både `threshold: 0.2` og `0.05`. Det samme
				 * gjaldt gjennomstreking av 15 datoer (226 piksler) og hvite
				 * skilleringer i AvatarGroup (1197 piksler).
				 *
				 * `threshold: 0` betyr at hver eneste avvikende piksel telles.
				 * `maxDiffPixels: 4` er målt, ikke gjettet:
				 *
				 *   1 piksel   subpiksel-jitter mellom kjøringer under parallell
				 *              last (observert på Switch - Tastatur)
				 *   168        minste ekte regresjon målt her (ikonbyttet)
				 *
				 * Grensa ligger like over støyen og langt under den minste ekte
				 * endringen. Begynner dette å flake i CI, er svaret et eget
				 * baseline-sett for den plattformen - ikke å slakke terskelen.
				 */
				threshold: 0,
				maxDiffPixels: 4,
				animations: "disabled",
				timeout: 20_000,
			});
		});
	}
});
