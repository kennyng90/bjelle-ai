import type { Importance, MessageState } from "./domain.ts";
import type { Issuer, MessageDetail, RawPayload } from "./source/types.ts";

/**
 * All skriving til D1 og R2 samlet ett sted. Kildelaget og berikelseslaget
 * skriver ikke selv: da kan begge kjøres om uten å røre lagringen.
 */

export type RunKind = "poll" | "backfill" | "company_sync";

export interface RunWindow {
	from: Date;
	to: Date;
}

export async function startRun(
	db: D1Database,
	kind: RunKind,
	window: RunWindow | null,
	now: Date,
): Promise<number> {
	const rad = await db
		.prepare(
			"INSERT INTO run (kind, started_at, window_from, window_to) VALUES (?, ?, ?, ?) RETURNING id",
		)
		.bind(
			kind,
			now.toISOString(),
			window?.from.toISOString() ?? null,
			window?.to.toISOString() ?? null,
		)
		.first<{ id: number }>();
	if (!rad) throw new Error("klarte ikke å registrere kjøringen");
	return rad.id;
}

export async function finishRun(
	db: D1Database,
	id: number,
	resultat: { found: number; stored: number; error?: string | null },
	startedAt: number,
	now: Date,
): Promise<void> {
	await db
		.prepare(
			"UPDATE run SET finished_at = ?, found = ?, stored = ?, duration_ms = ?, error = ? WHERE id = ?",
		)
		.bind(
			now.toISOString(),
			resultat.found,
			resultat.stored,
			Date.now() - startedAt,
			resultat.error ?? null,
			id,
		)
		.run();
}

/** Rålageret. Skrives før payloaden tolkes, slik at parsingen kan kjøres om. */
export async function putRaw(bucket: R2Bucket, key: string, raw: RawPayload): Promise<void> {
	await bucket.put(key, raw.body, {
		httpMetadata: { contentType: raw.contentType },
	});
}

export function listRawKey(runId: number, window: RunWindow): string {
	return `raw/list/${window.from.toISOString().slice(0, 10)}_${window.to.toISOString().slice(0, 10)}/${runId}.json`;
}

export function messageRawKey(sourceId: string): string {
	return `raw/message/${sourceId}.json`;
}

export function attachmentKey(messageId: string, attachmentId: string, filename: string): string {
	// Filnavnet er med for at et menneske skal kunne finne fram i bøtta, men
	// identifikatoren står først slik at nøkkelen er stabil om navnet endres.
	return `attachment/${messageId}/${attachmentId}-${filename.replace(/[^\w.-]+/g, "_")}`;
}

/** Hvilke av disse identifikatorene finnes allerede. Dublettvernet i praksis. */
export async function existingMessageIds(db: D1Database, ids: string[]): Promise<Set<string>> {
	if (ids.length === 0) return new Set();
	const funnet = new Set<string>();
	// D1 tåler ikke vilkårlig mange bindinger i én spørring.
	for (const bit of biter(ids, 100)) {
		const { results } = await db
			.prepare(`SELECT source_id FROM message WHERE source_id IN (${bit.map(() => "?").join(",")})`)
			.bind(...bit)
			.all<{ source_id: string }>();
		for (const rad of results) funnet.add(rad.source_id);
	}
	return funnet;
}

export function upsertCompany(db: D1Database, issuer: Issuer, now: Date): D1PreparedStatement {
	// Navn, ticker og marked kan endre seg. Status røres ikke her: en avnotering
	// oppdages av selskapssynkingen, og en gammel melding skal ikke kunne
	// gjenopplive et avnotert selskap.
	return db
		.prepare(
			`INSERT INTO company (issuer_id, name, ticker, market, status, updated_at)
			 VALUES (?, ?, ?, ?, 'listed', ?)
			 ON CONFLICT (issuer_id) DO UPDATE SET
			   name = excluded.name, ticker = excluded.ticker,
			   market = excluded.market, updated_at = excluded.updated_at`,
		)
		.bind(issuer.sourceId, issuer.name, issuer.ticker, issuer.market, now.toISOString());
}

export function insertMessage(
	db: D1Database,
	melding: MessageDetail,
	importance: Importance,
	rawKey: string,
	now: Date,
): D1PreparedStatement {
	// OR IGNORE er hele dublettvernet mot en overlappende cron: to kjøringer som
	// finner samme melding samtidig gir én rad, ikke en feil.
	return db
		.prepare(
			`INSERT OR IGNORE INTO message
			 (source_id, issuer_id, published_at, title, source_category, body, language,
			  source_url, state, importance, raw_key, corrects, corrected_by, stored_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'stored', ?, ?, ?, ?, ?)`,
		)
		.bind(
			melding.sourceId,
			melding.issuer.sourceId,
			melding.publishedAt,
			melding.title,
			melding.category,
			melding.body,
			melding.language,
			melding.url,
			importance,
			rawKey,
			melding.corrects,
			melding.correctedBy,
			now.toISOString(),
		);
}

/**
 * En korreksjon peker bakover på meldingen den retter. Framoverpekeren settes
 * her, slik at en feed kan se at en melding er utdatert uten å skanne tabellen.
 */
export function linkCorrection(
	db: D1Database,
	corrects: string,
	correctedBy: string,
): D1PreparedStatement {
	return db
		.prepare("UPDATE message SET corrected_by = ? WHERE source_id = ?")
		.bind(correctedBy, corrects);
}

export function insertAttachment(
	db: D1Database,
	messageId: string,
	attachmentId: string,
	filename: string,
	mediaType: string,
	key: string,
): D1PreparedStatement {
	return db
		.prepare(
			`INSERT OR REPLACE INTO attachment (message_id, source_id, filename, media_type, r2_key)
			 VALUES (?, ?, ?, ?, ?)`,
		)
		.bind(messageId, attachmentId, filename, mediaType, key);
}

export async function setState(db: D1Database, ids: string[], state: MessageState): Promise<void> {
	if (ids.length === 0) return;
	for (const bit of biter(ids, 100)) {
		await db
			.prepare(`UPDATE message SET state = ? WHERE source_id IN (${bit.map(() => "?").join(",")})`)
			.bind(state, ...bit)
			.run();
	}
}

/**
 * Meldinger som ble lagret, men aldri kom i kø. Skjer hvis køen var nede eller
 * kjøringen døde mellom lagring og utsending. Uten dette blir de liggende
 * usett for alltid, og løftet om at ingen melding går tapt er ikke sant.
 *
 * `publishedSince` avgrenser til meldinger som skal berikes proaktivt. Uten den
 * ville redningen dratt hele backfillen inn i køen, stikk i strid med at bare
 * de siste tre månedene berikes i batch.
 */
export async function strandedMessages(
	db: D1Database,
	limit: number,
	publishedSince: Date,
): Promise<string[]> {
	const { results } = await db
		.prepare(
			"SELECT source_id FROM message WHERE state = 'stored' AND published_at >= ? ORDER BY published_at LIMIT ?",
		)
		.bind(publishedSince.toISOString(), limit)
		.all<{ source_id: string }>();
	return results.map((r) => r.source_id);
}

export interface BackfillProgress {
	window_from: string;
	window_to: string;
	finished: number;
}

export async function readBackfillProgress(db: D1Database): Promise<BackfillProgress | null> {
	return db
		.prepare("SELECT window_from, window_to, finished FROM backfill_progress WHERE id = 1")
		.first<BackfillProgress>();
}

export async function writeBackfillProgress(
	db: D1Database,
	window: RunWindow,
	finished: boolean,
	now: Date,
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO backfill_progress (id, window_from, window_to, finished, updated_at)
			 VALUES (1, ?, ?, ?, ?)
			 ON CONFLICT (id) DO UPDATE SET
			   window_from = excluded.window_from, window_to = excluded.window_to,
			   finished = excluded.finished, updated_at = excluded.updated_at`,
		)
		.bind(window.from.toISOString(), window.to.toISOString(), finished ? 1 : 0, now.toISOString())
		.run();
}

/**
 * Selskapslista. Navn, ticker og notering oppdateres; markedet røres ikke,
 * fordi kilden ikke oppgir det her - det kommer fra meldingene. Ingen rader
 * slettes: et avnotert selskap skal beholde historikken sin.
 */
export function upsertCompanyRecord(
	db: D1Database,
	selskap: { sourceId: string; name: string; ticker: string | null; listed: boolean },
	now: Date,
): D1PreparedStatement {
	return db
		.prepare(
			`INSERT INTO company (issuer_id, name, ticker, market, status, updated_at)
			 VALUES (?, ?, ?, 'other', ?, ?)
			 ON CONFLICT (issuer_id) DO UPDATE SET
			   name = excluded.name, ticker = excluded.ticker,
			   status = excluded.status, updated_at = excluded.updated_at`,
		)
		.bind(
			selskap.sourceId,
			selskap.name,
			selskap.ticker,
			selskap.listed ? "listed" : "delisted",
			now.toISOString(),
		);
}

/** Alt berikelsen trenger om én melding, i ett oppslag. */
export interface MessageForEnrichment {
	source_id: string;
	title: string;
	body: string;
	source_category: string;
	state: MessageState;
	attempts: number;
	company_name: string | null;
}

export async function loadMessageForEnrichment(
	db: D1Database,
	sourceId: string,
): Promise<MessageForEnrichment | null> {
	return db
		.prepare(
			`SELECT m.source_id, m.title, m.body, m.source_category, m.state, m.attempts, c.name AS company_name
			 FROM message m LEFT JOIN company c ON c.issuer_id = m.issuer_id
			 WHERE m.source_id = ?`,
		)
		.bind(sourceId)
		.first<MessageForEnrichment>();
}

/**
 * Nullstiller forsøkstelleren. Brukes når en melding legges i kø på nytt av en
 * operatør: en melding som har brukt opp forsøkene sine skal få en ny sjanse,
 * ellers er en omkjøring etter en promptendring umulig.
 */
export async function resetAttempts(db: D1Database, ids: string[]): Promise<void> {
	if (ids.length === 0) return;
	for (const bit of biter(ids, 100)) {
		await db
			.prepare(
				`UPDATE message SET attempts = 0 WHERE source_id IN (${bit.map(() => "?").join(",")})`,
			)
			.bind(...bit)
			.run();
	}
}

/** Forsøkstelleren er det som gjør "tre forsøk brukt opp" observerbart. */
export async function countAttempt(db: D1Database, sourceId: string): Promise<number> {
	const rad = await db
		.prepare("UPDATE message SET attempts = attempts + 1 WHERE source_id = ? RETURNING attempts")
		.bind(sourceId)
		.first<{ attempts: number }>();
	return rad?.attempts ?? 0;
}

export interface EnrichmentRow {
	messageId: string;
	category: string;
	importance: Importance;
	clampedFrom: Importance | null;
	whatHappened: string;
	figures: unknown;
	terms: string[];
	unknownTerms: string[];
	model: string;
	promptHash: string;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
	discardedFigures: number;
}

/**
 * Skriver berikelsen og flytter meldingen til `enriched`. Gamle berikelsesrader
 * overskrives aldri: to promptversjoner skal kunne sammenlignes mot ekte data.
 */
export async function saveEnrichment(db: D1Database, rad: EnrichmentRow, now: Date): Promise<void> {
	const berikelse = await db
		.prepare(
			`INSERT INTO enrichment
			 (message_id, category, importance, what_happened, figures, model, prompt_hash,
			  input_tokens, output_tokens, cost_usd, discarded_figures, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
		)
		.bind(
			rad.messageId,
			rad.category,
			rad.importance,
			rad.whatHappened,
			JSON.stringify(rad.figures),
			rad.model,
			rad.promptHash,
			rad.inputTokens,
			rad.outputTokens,
			rad.costUsd,
			rad.discardedFigures,
			now.toISOString(),
		)
		.first<{ id: number }>();
	if (!berikelse) throw new Error("klarte ikke å lagre berikelsen");

	const skriv: D1PreparedStatement[] = [
		db
			.prepare(
				"UPDATE message SET state = 'enriched', importance = ?, clamped_from = ? WHERE source_id = ?",
			)
			.bind(rad.importance, rad.clampedFrom, rad.messageId),
	];

	for (const term of rad.terms) {
		skriv.push(
			db
				.prepare("INSERT OR IGNORE INTO term_hit (enrichment_id, term) VALUES (?, ?)")
				.bind(berikelse.id, term),
		);
	}

	// Arbeidskøen for redaksjonelt påfyll. Telleren viser hvor behovet er størst.
	for (const term of rad.unknownTerms) {
		skriv.push(
			db
				.prepare(
					`INSERT INTO unknown_term (term, occurrences, first_seen_at, last_seen_at)
					 VALUES (?, 1, ?, ?)
					 ON CONFLICT (term) DO UPDATE SET
					   occurrences = occurrences + 1, last_seen_at = excluded.last_seen_at`,
				)
				.bind(term, now.toISOString(), now.toISOString()),
		);
	}

	await db.batch(skriv);
}

export function* biter<T>(liste: T[], størrelse: number): Generator<T[]> {
	for (let i = 0; i < liste.length; i += størrelse) {
		yield liste.slice(i, i + størrelse);
	}
}
