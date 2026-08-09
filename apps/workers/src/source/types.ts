import type { Language, Market, SourceCategory } from "../domain.ts";

/**
 * Kildelaget. Én implementasjon i dag (Newsweb), og ingen annen modul kjenner
 * den. Vilkårene til Euronext er en akseptert risiko, og dette interfacet er
 * prisen vi betaler for å kunne bytte kilde på uker.
 *
 * Issue #2 beskriver to operasjoner: hent meldinger nyere enn et tidspunkt, og
 * hent hele meldingen med vedleggsreferanser. Begge er delt i et hent-steg og
 * et tolke-steg, fordi rålageret skal skrives *før* noe parses. Delingen er det
 * som gjør omkjøring fra rålageret mulig: `parseList` og `parseMessage` er rene
 * funksjoner som tar akkurat de bytene R2 har lagret.
 */
export interface Source {
	fetchList(window: TimeWindow): Promise<RawPayload>;
	fetchMessage(sourceId: string): Promise<RawPayload>;
	fetchAttachment(ref: AttachmentRef): Promise<RawPayload>;

	/** @throws {SourceFormatError} når payloaden ikke har forventet form. */
	parseList(raw: RawPayload): Listing;
	/** @throws {SourceFormatError} når payloaden ikke har forventet form. */
	parseMessage(raw: RawPayload): MessageDetail;
}

/** Bytene slik de kom fra kilden. Skrives til R2 før de tolkes. */
export interface RawPayload {
	body: ArrayBuffer;
	contentType: string;
}

export interface TimeWindow {
	from: Date;
	to: Date;
}

export interface Listing {
	messages: MessageSummary[];
	/**
	 * Kilden hadde flere treff enn den ville returnere. Vinduet må deles, ellers
	 * mister backfillen meldinger i det stille - som er verre enn å feile.
	 */
	truncated: boolean;
}

export interface Issuer {
	sourceId: string;
	name: string;
	ticker: string | null;
	market: Market;
}

export interface MessageSummary {
	sourceId: string;
	issuer: Issuer;
	/** ISO 8601 i UTC, slik kilden oppga det. */
	publishedAt: string;
	title: string;
	category: SourceCategory;
	/** Meldingen denne retter. */
	corrects: string | null;
	/** Meldingen som retter denne. */
	correctedBy: string | null;
	attachmentCount: number;
	/** Lenke til originalen hos kilden. */
	url: string;
}

export interface MessageDetail extends MessageSummary {
	body: string;
	language: Language;
	attachments: AttachmentRef[];
}

export interface AttachmentRef {
	sourceId: string;
	messageId: string;
	filename: string;
}

/**
 * Kilden svarte, men i en form vi ikke kjenner. Dette er den stille feilen som
 * må bråke: en kjøring som treffer den skal registreres som feilet, ikke som en
 * vellykket kjøring uten nye meldinger.
 */
export class SourceFormatError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SourceFormatError";
	}
}

/** Kilden svarte ikke, eller svarte med en feilkode. */
export class SourceUnavailableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SourceUnavailableError";
	}
}
