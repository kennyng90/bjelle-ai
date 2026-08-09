import { BERIK_VINDU_MS, ingest } from "./ingest.ts";
import type { Source, TimeWindow } from "./source/types.ts";
import { readBackfillProgress, writeBackfillProgress } from "./store.ts";

/**
 * Backfill av tolv måneder historikk. Egen jobb, egen cron, egen framdrift:
 * innhenting av et år med historikk skal aldri kunne stoppe sanntidsdelen.
 *
 * Den går bakover én bit om gangen og kan avbrytes når som helst. Framdriften
 * er lagret, og en bit er først ferdig når den ikke har flere ukjente meldinger
 * igjen - ikke når kjøringen er over. Uten det skillet ville taket på hvor mange
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

/**
 * Hvor mange kjøringer på rad en bit får stå uten framgang før vi går videre.
 *
 * Uten taket står backfillen fast for alltid på én melding kilden nekter å
 * levere. Med det går den videre, men bråker først: en bit vi ga opp er noe
 * noen må se på, ikke noe som skal forsvinne i stillhet.
 */
const MAKS_UTEN_FRAMGANG = 3;

export async function backfill(env: Env, source: Source, now: Date): Promise<void> {
	const framdrift = await readBackfillProgress(env.DB);
	if (framdrift?.finished === 1) return;

	let vindu = framdrift
		? { from: new Date(framdrift.window_from), to: new Date(framdrift.window_to) }
		: førsteVindu(now);
	let utenFramgang = framdrift?.stalled ?? 0;

	for (let i = 0; i < BITER_PER_KJØRING; i++) {
		if (vindu.to <= new Date(now.getTime() - HISTORIKK_MS)) {
			await writeBackfillProgress(env.DB, vindu, true, 0, now);
			console.log({ hendelse: "backfill_ferdig" });
			return;
		}

		const status = await taBit(env, source, vindu, now);

		if (status === "framgang") {
			// Noe ble lagret, men biten har mer igjen. Bli stående på den.
			await writeBackfillProgress(env.DB, vindu, false, 0, now);
			return;
		}

		if (status === "har_mer") {
			// Biten har ukjente meldinger igjen, men ingen lot seg lagre. Kilden
			// svarer, bare ikke på disse. Prøv igjen noen ganger før vi gir opp.
			utenFramgang++;
			if (utenFramgang < MAKS_UTEN_FRAMGANG) {
				await writeBackfillProgress(env.DB, vindu, false, utenFramgang, now);
				return;
			}
			console.error({
				hendelse: "backfill_ga_opp_bit",
				fra: dag(vindu.from),
				til: dag(vindu.to),
				forsøk: utenFramgang,
			});
		}

		vindu = forrigeVindu(vindu);
		utenFramgang = 0;
		await writeBackfillProgress(env.DB, vindu, false, 0, now);
	}
}

/**
 * Utfallet av å hente én bit.
 *
 * `tom` betyr at kilden ikke har flere meldinger vi mangler, og er det eneste
 * som gir rett til å gå videre. At null ble lagret duger ikke som mål: en
 * melding kilden svarte 502 på telles som null lagret, og en bit full av slike
 * ville sett tom ut og blitt hoppet over for godt - backfillen går bare bakover
 * og får aldri se den igjen.
 */
type BitStatus = "tom" | "framgang" | "har_mer";

async function taBit(env: Env, source: Source, vindu: TimeWindow, now: Date): Promise<BitStatus> {
	const beriker = vindu.from.getTime() >= now.getTime() - BERIK_VINDU_MS;
	const resultat = await ingest(env, source, "backfill", vindu, now, { enqueue: beriker });

	if (resultat.truncated) {
		// Kilden hadde flere treff enn den ville returnere. Deler vi ikke biten,
		// mister vi meldinger uten at noe sier fra.
		//
		// Kilden bruker inklusive datogrenser, så en bit er udelelig først når fra
		// og til er samme kalenderdag - ikke når differansen er ett døgn.
		if (dag(vindu.from) === dag(vindu.to)) {
			console.error({ hendelse: "backfill_kappet_paa_en_dag", dato: dag(vindu.from) });
			return "tom";
		}
		const dager = (vindu.to.getTime() - vindu.from.getTime()) / DAG_MS;
		const midt = new Date(vindu.from.getTime() + Math.max(1, Math.floor(dager / 2)) * DAG_MS);
		const eldst = await taBit(env, source, { from: vindu.from, to: midt }, now);
		const nyest = await taBit(env, source, { from: midt, to: vindu.to }, now);
		return eldst === "tom" && nyest === "tom" ? "tom" : "har_mer";
	}

	if (resultat.remaining === 0) return "tom";
	return resultat.stored > 0 ? "framgang" : "har_mer";
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

function dag(d: Date): string {
	return d.toISOString().slice(0, 10);
}
