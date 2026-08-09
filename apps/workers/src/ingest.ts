import { defaultImportance } from "./classify.ts";
import type { MessageDetail, MessageSummary, Source, TimeWindow } from "./source/types.ts";
import { SourceFormatError } from "./source/types.ts";
import {
	attachmentKey,
	biter,
	existingMessageIds,
	finishRun,
	insertAttachment,
	insertMessage,
	linkCorrection,
	listRawKey,
	messageRawKey,
	putRaw,
	type RunKind,
	setState,
	startRun,
	strandedMessages,
	upsertCompany,
} from "./store.ts";

/** Meldingen som legges på berikelseskøen. Kun identifikatoren: brødteksten er
 * allerede lagret, og en kø som bærer innhold blir umulig å kjøre om. */
export interface EnrichmentJob {
	messageId: string;
}

/**
 * Hvor mange nye meldinger én kjøring tar. Cronen skal alltid bli ferdig, og
 * resten ligger i kildens vindu og plukkes opp av neste kjøring om fem minutter.
 */
const MAKS_NYE_PER_KJØRING = 60;

/** Samtidighet mot kilden. Vi vil ikke bli utestengt. */
const SAMTIDIGE_KALL = 4;

/** Tak på hvor mange strandede meldinger én kjøring rydder opp i. */
const MAKS_REDNING = 50;

/**
 * Hvor gammel en melding kan være og likevel berikes proaktivt. Eldre enn dette
 * lagres, men berikes først ved første lesing - jf. docs/BESLUTNINGER.md.
 */
export const BERIK_VINDU_MS = 92 * 24 * 60 * 60 * 1000;

export interface IngestResult {
	found: number;
	stored: number;
	truncated: boolean;
}

export interface IngestOptions {
	/**
	 * Om meldingene skal legges i berikelseskøen. Backfill av noe eldre enn tre
	 * måneder lagrer uten å berike.
	 */
	enqueue: boolean;
}

/**
 * Én inntakskjøring. Vinduet er dagsgranulært fordi kilden er det, og et
 * overlapp koster ingenting: meldingsidentifikatoren er unik i databasen, så to
 * kjøringer som ser den samme meldingen gir én rad.
 */
export async function ingest(
	env: Env,
	source: Source,
	kind: RunKind,
	window: TimeWindow,
	now: Date,
	options: IngestOptions = { enqueue: true },
): Promise<IngestResult> {
	const startet = Date.now();
	const runId = await startRun(env.DB, kind, window, now);

	try {
		// Rått til R2 før noe tolkes. Endrer kilden format, ligger payloaden der
		// og kan kjøres om med en ny parser.
		const raw = await source.fetchList(window);
		await putRaw(env.RAW, listRawKey(runId, window), raw);

		const listing = source.parseList(raw);
		const eksisterende = await existingMessageIds(
			env.DB,
			listing.messages.map((m) => m.sourceId),
		);
		const nye = listing.messages
			.filter((m) => !eksisterende.has(m.sourceId))
			.slice(0, MAKS_NYE_PER_KJØRING);

		const lagret = await iParallell(nye, SAMTIDIGE_KALL, (m) => lagreMelding(env, source, m, now));
		const lagredeIder = lagret.filter((id): id is string => id !== null);

		if (options.enqueue) {
			// Meldinger fra tidligere kjøringer som aldri kom i kø tas med her. Uten
			// dette blir en melding liggende usett for alltid hvis køen var nede.
			const strandede = await strandedMessages(
				env.DB,
				MAKS_REDNING,
				new Date(now.getTime() - BERIK_VINDU_MS),
			);
			await køLegg(env, [...new Set([...lagredeIder, ...strandede])]);
		}

		await finishRun(
			env.DB,
			runId,
			{ found: listing.messages.length, stored: lagredeIder.length },
			startet,
			now,
		);
		return {
			found: listing.messages.length,
			stored: lagredeIder.length,
			truncated: listing.truncated,
		};
	} catch (feil) {
		// En kjøring som feilet på parsing registreres som feil med null lagret,
		// ikke som en vellykket kjøring uten nye meldinger. Det er forskjellen
		// mellom en alarm og en stille feil.
		const melding = feil instanceof Error ? `${feil.name}: ${feil.message}` : String(feil);
		await finishRun(env.DB, runId, { found: 0, stored: 0, error: melding }, startet, now);
		throw feil;
	}
}

/**
 * Lagrer én melding med rålager, vedlegg og viktighet. Returnerer identifikatoren
 * hvis den ble lagret, og null hvis den feilet. En melding som feiler skal ikke
 * ta resten av kjøringen med seg.
 */
async function lagreMelding(
	env: Env,
	source: Source,
	sammendrag: MessageSummary,
	now: Date,
): Promise<string | null> {
	try {
		const raw = await source.fetchMessage(sammendrag.sourceId);
		const rawKey = messageRawKey(sammendrag.sourceId);
		await putRaw(env.RAW, rawKey, raw);

		const melding = source.parseMessage(raw);
		const vedlegg = await lagreVedlegg(env, source, melding);

		const skriv: D1PreparedStatement[] = [
			upsertCompany(env.DB, melding.issuer, now),
			insertMessage(env.DB, melding, defaultImportance(melding.category), rawKey, now),
			...vedlegg,
		];
		if (melding.corrects) {
			skriv.push(linkCorrection(env.DB, melding.corrects, melding.sourceId));
		}
		await env.DB.batch(skriv);

		return melding.sourceId;
	} catch (feil) {
		// Formatfeil på én melding skal bråke: den betyr som regel at kilden har
		// endret seg, og da gjelder det alle meldinger.
		if (feil instanceof SourceFormatError) throw feil;
		console.error({
			hendelse: "melding_feilet",
			meldingId: sammendrag.sourceId,
			feil: String(feil),
		});
		return null;
	}
}

async function lagreVedlegg(
	env: Env,
	source: Source,
	melding: MessageDetail,
): Promise<D1PreparedStatement[]> {
	const rader: D1PreparedStatement[] = [];
	for (const ref of melding.attachments) {
		const innhold = await source.fetchAttachment(ref);
		const key = attachmentKey(ref.messageId, ref.sourceId, ref.filename);
		await putRaw(env.RAW, key, innhold);
		rader.push(
			insertAttachment(
				env.DB,
				ref.messageId,
				ref.sourceId,
				ref.filename,
				mediatype(ref.filename),
				key,
			),
		);
	}
	return rader;
}

/**
 * Legger meldingene på berikelseskøen og flytter dem til `queued`. Rekkefølgen
 * er med vilje: en melding som står i `stored` fordi køen var nede blir plukket
 * opp igjen, mens en som står i `queued` uten å ha kommet fram ville vært tapt.
 */
async function køLegg(env: Env, ider: string[]): Promise<void> {
	if (ider.length === 0) return;
	for (const bit of biter(ider, 100)) {
		await env.ENRICHMENT.sendBatch(
			bit.map((messageId) => ({ body: { messageId } satisfies EnrichmentJob })),
		);
		await setState(env.DB, bit, "queued");
	}
}

const MEDIATYPER: Record<string, string> = {
	pdf: "application/pdf",
	xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	zip: "application/zip",
	html: "text/html",
	txt: "text/plain",
	xhtml: "application/xhtml+xml",
};

// Kilden svarer application/octet-stream på alle vedlegg, så filendelsen er det
// eneste vi har å gå på.
function mediatype(filnavn: string): string {
	const endelse = filnavn.split(".").pop()?.toLowerCase() ?? "";
	return MEDIATYPER[endelse] ?? "application/octet-stream";
}

async function iParallell<T, R>(
	elementer: T[],
	grense: number,
	fn: (element: T) => Promise<R>,
): Promise<R[]> {
	const resultat: R[] = new Array(elementer.length);
	let neste = 0;
	const arbeidere = Array.from({ length: Math.min(grense, elementer.length) }, async () => {
		while (neste < elementer.length) {
			const i = neste++;
			resultat[i] = await fn(elementer[i] as T);
		}
	});
	await Promise.all(arbeidere);
	return resultat;
}
