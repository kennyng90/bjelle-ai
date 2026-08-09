import { BERIK_VINDU_MS, ingest } from "./ingest.ts";
import type { Source, TimeWindow } from "./source/types.ts";
import { readBackfillProgress, writeBackfillProgress } from "./store.ts";

/**
 * Backfill av tolv måneder historikk. Egen jobb, egen cron, egen framdrift:
 * innhenting av et år med historikk skal aldri kunne stoppe sanntidsdelen.
 *
 * Den går bakover én bit om gangen og kan avbrytes når som helst. Framdriften
 * er lagret, og en bit er først ferdig når en kjøring ikke finner noe nytt i
 * den - ikke når kjøringen er over. Uten det skillet ville taket på hvor mange
 * meldinger én kjøring tar gjort at biter ble merket ferdige med hull i.
 */

const DAG_MS = 24 * 60 * 60 * 1000;

/** Hvor langt tilbake backfillen går. */
const HISTORIKK_MS = 365 * DAG_MS;

/**
 * Størrelsen på én bit. Kilden kapper på 600 treff, og fem dager ligger godt
 * under selv i rapportsesongen. Blir en bit likevel kappet, deles den.
 */
const BIT_DAGER = 5;

/** Hvor mange biter én kjøring tar. Kjøringen skal alltid bli ferdig. */
const BITER_PER_KJØRING = 2;

export async function backfill(env: Env, source: Source, now: Date): Promise<void> {
	const framdrift = await readBackfillProgress(env.DB);
	if (framdrift?.finished === 1) return;

	let vindu = framdrift
		? { from: new Date(framdrift.window_from), to: new Date(framdrift.window_to) }
		: førsteVindu(now);

	for (let i = 0; i < BITER_PER_KJØRING; i++) {
		const eldsteTillatt = new Date(now.getTime() - HISTORIKK_MS);
		if (vindu.to <= eldsteTillatt) {
			await writeBackfillProgress(env.DB, vindu, true, now);
			console.log({ hendelse: "backfill_ferdig" });
			return;
		}

		const tømt = await taBit(env, source, vindu, now);
		if (!tømt) {
			// Biten hadde flere meldinger enn taket per kjøring. Neste kjøring tar
			// resten av den samme biten.
			await writeBackfillProgress(env.DB, vindu, false, now);
			return;
		}

		vindu = forrigeVindu(vindu);
		await writeBackfillProgress(env.DB, vindu, false, now);
	}
}

/**
 * Henter én bit. Returnerer true når biten er tom for nye meldinger.
 *
 * Ble svaret kappet av kilden, deles biten i to og begge halvdeler hentes.
 * Uten det mister backfillen meldinger i det stille, som er verre enn å feile.
 */
async function taBit(env: Env, source: Source, vindu: TimeWindow, now: Date): Promise<boolean> {
	const beriker = vindu.from.getTime() >= now.getTime() - BERIK_VINDU_MS;
	const resultat = await ingest(env, source, "backfill", vindu, now, { enqueue: beriker });

	if (!resultat.truncated) return resultat.stored === 0;

	const dager = (vindu.to.getTime() - vindu.from.getTime()) / DAG_MS;
	if (dager <= 1) {
		// Én dag med over 600 meldinger. Da er det ikke mer å dele på, og det må
		// bråke i stedet for å forsvinne.
		console.error({ hendelse: "backfill_kappet_paa_en_dag", fra: vindu.from.toISOString() });
		return true;
	}

	const midt = new Date(vindu.from.getTime() + Math.floor(dager / 2) * DAG_MS);
	const eldst = await taBit(env, source, { from: vindu.from, to: midt }, now);
	const nyest = await taBit(env, source, { from: midt, to: vindu.to }, now);
	return eldst && nyest;
}

/** Backfillen starter der pollingens døgnvindu slutter. */
function førsteVindu(now: Date): TimeWindow {
	const to = new Date(now.getTime() - DAG_MS);
	return { from: new Date(to.getTime() - BIT_DAGER * DAG_MS), to };
}

function forrigeVindu(vindu: TimeWindow): TimeWindow {
	return {
		from: new Date(vindu.from.getTime() - BIT_DAGER * DAG_MS),
		to: vindu.from,
	};
}
