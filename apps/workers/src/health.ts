/**
 * Den stille feilen som må bråke. For et varselprodukt er "ingenting skjer" den
 * verste feiltilstanden, fordi den ser nøyaktig ut som en rolig dag på børsen.
 */

/** Alarm hvis én av de tre siste pollingene er registrert med feil. */
const SISTE_KJØRINGER = 3;

/**
 * Hvor lenge en kjøring får stå uten sluttidspunkt før den regnes som avbrutt.
 * To cron-intervaller, slik at en kjøring som fortsatt pågår ikke gir alarm.
 */
const AVBRUTT_ETTER_MS = 10 * 60 * 1000;

/**
 * Alarm hvis ingen poll-kjøring har lagret en eneste melding på tre timer mens
 * børsen har vært åpen.
 *
 * Issue #2 foreslår tre kjøringer på rad uten nye meldinger. Med polling hvert
 * femte minutt er det et kvarter, og Oslo Børs sender rundt 45 meldinger på en
 * hel dag - et stille kvarter er helt normalt og ville gitt alarm hele dagen.
 * Tre timer er det samme prinsippet med et tall som faktisk betyr noe.
 */
const STILLHET_MS = 3 * 60 * 60 * 1000;

/** Nok kjøringer i vinduet til at stillheten er reell og ikke bare nedetid hos oss. */
const MINST_KJØRINGER_I_VINDUET = 12;

export interface HealthReport {
	alarm: boolean;
	reasons: string[];
	lastRunAt: string | null;
	exchangeOpen: boolean;
}

export async function checkHealth(db: D1Database, now: Date): Promise<HealthReport> {
	const reasons: string[] = [];

	const { results: siste } = await db
		.prepare(
			"SELECT started_at, finished_at, error FROM run WHERE kind = 'poll' ORDER BY id DESC LIMIT ?",
		)
		.bind(SISTE_KJØRINGER)
		.all<{ started_at: string; finished_at: string | null; error: string | null }>();

	// En kjøring uten sluttidspunkt ble drept før den rakk å skrive noe - av
	// CPU-grensen, en timeout eller et krasj. Uten denne sjekken ser den
	// nøyaktig ut som en vellykket, stille kjøring, og en worker som dør på
	// hver eneste polling ville aldri gitt alarm.
	const grense = new Date(now.getTime() - AVBRUTT_ETTER_MS).toISOString();
	const feilet = siste.filter(
		(r) => r.error !== null || (r.finished_at === null && r.started_at < grense),
	);
	if (feilet.length > 0) {
		reasons.push(
			`${feilet.length} av de ${siste.length} siste pollingene feilet eller ble avbrutt`,
		);
	}

	const åpen = exchangeOpen(now) && exchangeOpen(new Date(now.getTime() - STILLHET_MS));
	if (åpen) {
		const vindu = await db
			.prepare(
				`SELECT COUNT(*) AS kjøringer, COALESCE(SUM(stored), 0) AS lagret
				 FROM run WHERE kind = 'poll' AND error IS NULL AND started_at >= ?`,
			)
			.bind(new Date(now.getTime() - STILLHET_MS).toISOString())
			.first<{ kjøringer: number; lagret: number }>();

		if ((vindu?.kjøringer ?? 0) >= MINST_KJØRINGER_I_VINDUET && (vindu?.lagret ?? 0) === 0) {
			reasons.push("ingen nye meldinger på tre timer mens børsen var åpen");
		}
	}

	return {
		alarm: reasons.length > 0,
		reasons,
		lastRunAt: siste[0]?.started_at ?? null,
		exchangeOpen: exchangeOpen(now),
	};
}

/**
 * Oslo Børs har kontinuerlig handel 09:00-16:20 lokal tid på hverdager. Vinduet
 * her er trukket inn til 08:00-15:00 UTC med vilje, slik at det ligger innenfor
 * åpningstiden både sommer- og vinterstid. Vi vil heller ha en alarm for lite i
 * kanten enn en falsk alarm hver eneste morgen.
 */
export function exchangeOpen(tidspunkt: Date): boolean {
	const ukedag = tidspunkt.getUTCDay();
	if (ukedag === 0 || ukedag === 6) return false;
	const time = tidspunkt.getUTCHours();
	return time >= 8 && time < 15;
}
