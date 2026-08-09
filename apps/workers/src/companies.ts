import type { Source } from "./source/types.ts";
import { biter, finishRun, putRaw, startRun, upsertCompanyRecord } from "./store.ts";

/**
 * Selskapslista. Meldingsinntaket oppretter selskaper etter hvert som de melder
 * noe, så et nynotert selskap mister aldri sin første melding. Denne kjøringen
 * gjør det lista ikke kan gjøre selv: fanger navneendringer på selskaper som
 * ikke har meldt noe, og markerer avnoteringer.
 *
 * Ingen rader slettes. Et avnotert selskap beholder historikken sin.
 */
export async function syncCompanies(env: Env, source: Source, now: Date): Promise<void> {
	const startet = Date.now();
	const runId = await startRun(env.DB, "company_sync", null, now);

	try {
		const raw = await source.fetchCompanies();
		await putRaw(env.RAW, `raw/companies/${now.toISOString().slice(0, 10)}.json`, raw);

		const selskaper = source.parseCompanies(raw);
		for (const bit of biter(selskaper, 50)) {
			await env.DB.batch(bit.map((s) => upsertCompanyRecord(env.DB, s, now)));
		}

		await finishRun(
			env.DB,
			runId,
			{ found: selskaper.length, stored: selskaper.length },
			startet,
			now,
		);
	} catch (feil) {
		const melding = feil instanceof Error ? `${feil.name}: ${feil.message}` : String(feil);
		await finishRun(env.DB, runId, { found: 0, stored: 0, error: melding }, startet, now);
		throw feil;
	}
}
