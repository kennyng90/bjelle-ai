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
 */
export async function strandedMessages(db: D1Database, limit: number): Promise<string[]> {
	const { results } = await db
		.prepare("SELECT source_id FROM message WHERE state = 'stored' ORDER BY published_at LIMIT ?")
		.bind(limit)
		.all<{ source_id: string }>();
	return results.map((r) => r.source_id);
}

export function* biter<T>(liste: T[], størrelse: number): Generator<T[]> {
	for (let i = 0; i < liste.length; i += størrelse) {
		yield liste.slice(i, i + størrelse);
	}
}
