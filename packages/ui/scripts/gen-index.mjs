/*
 * Genererer src/index.ts fra komponentfilene.
 *
 * En håndskrevet indeks råtner: noen legger til en komponent og glemmer linja,
 * og da finnes komponenten i Storybook men ikke for appene. Her leses
 * eksportene ut av kilden, så de to kan ikke komme ut av synk.
 *
 *   pnpm --filter @bjelle/ui gen:index
 *
 * Skriptet kjeder på `biome check --write` til slutt. Biome eier formateringen
 * og sorteringen av eksportnavn, ikke dette skriptet - ellers ville utdata
 * vært rødt i `pnpm check` rett etter at det ble generert.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("../src", import.meta.url));

// Interne moduler. `dialog/` er delt maskineri for Modal og Drawer, ikke et
// API. `foundations/` er bare dokumentasjonsstories.
const PRIVATE = new Set(["dialog", "foundations"]);

const EKSPORT = /^export\s+(?:(type|interface)\s+(\w+)|(?:const|function|class)\s+(\w+))/gm;

const linjer = [];
const settVerdier = new Map();
const settTyper = new Map();

for (const mappe of readdirSync(SRC).sort()) {
	if (PRIVATE.has(mappe) || !statSync(join(SRC, mappe)).isDirectory()) continue;

	for (const fil of readdirSync(join(SRC, mappe)).sort()) {
		if (!/\.tsx?$/.test(fil) || fil.endsWith(".stories.tsx")) continue;

		const kilde = readFileSync(join(SRC, mappe, fil), "utf8");
		const verdier = [];
		const typer = [];
		for (const m of kilde.matchAll(EKSPORT)) {
			(m[1] ? typer : verdier).push(m[1] ? m[2] : m[3]);
		}
		if (!verdier.length && !typer.length) continue;

		const sti = `./${mappe}/${fil}`;
		for (const [navn, sett] of [
			...typer.map((n) => [n, settTyper]),
			...verdier.map((n) => [n, settVerdier]),
		]) {
			const fra = sett.get(navn);
			if (fra) {
				// Uten denne blir kollisjonen en TS2300 langt nede i en
				// generert fil, og det er ikke åpenbart hvem som eier navnet.
				// Skjedde med `HeadingLevel`, definert av både Accordion og
				// Heading som to ulike begreper.
				throw new Error(
					`Navnekollisjon: "${navn}" eksporteres av både ${fra} og ${sti}. ` +
						"Er det samme begrep, la den ene importere fra den andre. " +
						"Er det to begreper, gi dem hvert sitt navn.",
				);
			}
			sett.set(navn, sti);
		}

		if (typer.length) {
			linjer.push(`export type { ${[...new Set(typer)].sort().join(", ")} } from "${sti}";`);
		}
		if (verdier.length) {
			linjer.push(`export { ${[...new Set(verdier)].sort().join(", ")} } from "${sti}";`);
		}
	}
}

if (!linjer.length) throw new Error("fant ingen eksporter - står du i riktig mappe?");

const topp = `/*
 * Pakkens offentlige API.
 *
 * GENERERT AV scripts/gen-index.mjs - ikke rediger for hånd.
 * Kjør: pnpm --filter @bjelle/ui gen:index && pnpm check --write
 */
`;

writeFileSync(join(SRC, "index.ts"), `${topp}${linjer.join("\n")}\n`, "utf8");
console.log(`${linjer.length} eksportlinjer skrevet fra ${settVerdier.size} komponenter`);
