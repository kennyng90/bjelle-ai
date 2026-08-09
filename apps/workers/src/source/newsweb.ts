import type { Market, SourceCategory } from "../domain.ts";
import { detectLanguage } from "../language.ts";
import {
	type AttachmentRef,
	type CompanyRecord,
	type Listing,
	type MessageDetail,
	type MessageSummary,
	type RawPayload,
	type Source,
	SourceFormatError,
	SourceUnavailableError,
	type TimeWindow,
} from "./types.ts";

const API = "https://api3.oslo.oslobors.no/v1/newsreader";
const WEB = "https://newsweb.oslobors.no/message";

/**
 * Kildens kategori-id til vår normaliserte nøkkel. Listen er hentet ved å lese
 * tolv måneder med meldinger; kilden legger til id-er uten forvarsel, og alt
 * ukjent faller til `unknown` i stedet for å feile.
 */
const KATEGORIER: Record<number, SourceCategory> = {
	1001: "annual_report",
	1002: "half_year_report",
	1003: "quarterly_report",
	1004: "home_member_state",
	1005: "inside_information",
	1006: "major_shareholding",
	1007: "own_shares",
	1008: "voting_rights_and_capital",
	1009: "rights_changes",
	1010: "additional_regulated_information",
	1101: "ex_date",
	1102: "managers_transaction",
	1103: "prospectus",
	1104: "press_release",
	1105: "interest_rate_adjustment",
	1202: "trading_halt",
	1207: "exchange_announcement",
	1208: "third_party_announcement",
	1301: "fsa_announcement",
	1302: "central_bank_announcement",
};

/**
 * MIC-kodene kilden bruker. En melding kan være merket flere markeder samtidig,
 * og da vinner den mest omsatte lista. XOAM er obligasjonsmarkedet: det er ikke
 * en aksjeliste vi lover dekning av, men meldingene lagres uansett.
 */
const MARKEDER: Record<string, Market> = {
	XOSL: "main_list",
	XOAX: "expand",
	MERK: "growth",
};
const MARKEDSPRIORITET: Market[] = ["main_list", "expand", "growth", "other"];

interface NewswebKategori {
	id: number;
}

interface NewswebSammendrag {
	messageId: number;
	title: string;
	publishedTime: string;
	issuerId: number;
	issuerName: string;
	issuerSign: string;
	markets: string[];
	category: NewswebKategori[];
	correctionForMessageId: number;
	correctedByMessageId: number;
	numbAttachments: number;
}

interface NewswebUtsteder {
	issuerId: number;
	name: string;
	issuerSign: string;
	isActive: number;
}

interface NewswebMelding extends NewswebSammendrag {
	body: string;
	attachments?: { id: number; name: string }[];
}

export class NewswebSource implements Source {
	async fetchList(window: TimeWindow): Promise<RawPayload> {
		// Kilden er dagsgranulær. Et klokkeslett i fromDate avvises med feil, så
		// vinduet rundes ut til hele dager og overlappet håndteres av at
		// meldingsidentifikatoren er unik i databasen.
		const params = new URLSearchParams({
			category: "",
			issuer: "",
			fromDate: dag(window.from),
			toDate: dag(window.to),
			market: "",
			messageTitle: "",
		});
		return hent(`${API}/list?${params}`);
	}

	async fetchMessage(sourceId: string): Promise<RawPayload> {
		return hent(`${API}/message?messageId=${encodeURIComponent(sourceId)}`);
	}

	async fetchAttachment(ref: AttachmentRef): Promise<RawPayload> {
		const params = new URLSearchParams({
			messageId: ref.messageId,
			attachmentId: ref.sourceId,
		});
		return hent(`${API}/attachment?${params}`);
	}

	async fetchCompanies(): Promise<RawPayload> {
		// Utstederlista svarer kun på POST. Tom kropp gir hele lista.
		return hent(`${API}/issuers`, {
			method: "POST",
			headers: { accept: "application/json", "content-type": "application/json" },
			body: "{}",
		});
	}

	parseCompanies(raw: RawPayload): CompanyRecord[] {
		const data = konvolutt(raw);
		if (!Array.isArray(data.issuers)) {
			throw new SourceFormatError("data.issuers er ikke en liste");
		}
		return (data.issuers as NewswebUtsteder[]).map((u) => {
			if (typeof u?.issuerId !== "number") {
				throw new SourceFormatError("utsteder mangler issuerId");
			}
			return {
				sourceId: String(u.issuerId),
				name: u.name ?? "",
				ticker: u.issuerSign || null,
				listed: u.isActive === 1,
			};
		});
	}

	parseList(raw: RawPayload): Listing {
		const data = konvolutt(raw);
		const messages = data.messages;
		if (!Array.isArray(messages)) {
			throw new SourceFormatError("data.messages er ikke en liste");
		}
		return {
			messages: messages.map((m) => sammendrag(m as NewswebSammendrag)),
			truncated: data.overflow === true,
		};
	}

	parseMessage(raw: RawPayload): MessageDetail {
		const data = konvolutt(raw);
		const melding = data.message as NewswebMelding | undefined;
		if (!melding || typeof melding !== "object") {
			throw new SourceFormatError("data.message mangler");
		}
		const body = melding.body;
		if (typeof body !== "string") {
			throw new SourceFormatError(`melding ${melding.messageId} mangler brødtekst`);
		}
		const id = String(melding.messageId);
		return {
			...sammendrag(melding),
			body,
			language: detectLanguage(body),
			attachments: (melding.attachments ?? []).map((v) => ({
				sourceId: String(v.id),
				messageId: id,
				// Uten reserveverdien ville et vedlegg uten navn kastet lenger nede
				// og tatt hele meldingen med seg. Et vedlegg er aldri verdt en melding.
				filename: typeof v.name === "string" && v.name !== "" ? v.name : `vedlegg-${v.id}`,
			})),
		};
	}
}

async function hent(url: string, init?: RequestInit): Promise<RawPayload> {
	let svar: Response;
	try {
		svar = await fetch(url, init ?? { headers: { accept: "application/json" } });
	} catch (feil) {
		throw new SourceUnavailableError(`kilden svarte ikke: ${feil}`);
	}
	if (!svar.ok) {
		throw new SourceUnavailableError(`kilden svarte ${svar.status} på ${url}`);
	}
	return {
		body: await svar.arrayBuffer(),
		contentType: svar.headers.get("content-type") ?? "application/octet-stream",
	};
}

// biome-ignore lint/suspicious/noExplicitAny: rå payload fra kilden, valideres feltvis under
function konvolutt(raw: RawPayload): any {
	let tolket: unknown;
	try {
		tolket = JSON.parse(new TextDecoder().decode(raw.body));
	} catch (feil) {
		throw new SourceFormatError(`payloaden er ikke gyldig JSON: ${feil}`);
	}
	const data = (tolket as { data?: unknown }).data;
	if (!data || typeof data !== "object") {
		throw new SourceFormatError("payloaden mangler data-konvolutten");
	}
	return data;
}

function sammendrag(m: NewswebSammendrag): MessageSummary {
	if (typeof m?.messageId !== "number" || typeof m.title !== "string") {
		throw new SourceFormatError("melding mangler messageId eller title");
	}
	if (typeof m.publishedTime !== "string" || Number.isNaN(Date.parse(m.publishedTime))) {
		throw new SourceFormatError(`melding ${m.messageId} mangler gyldig publishedTime`);
	}
	const id = String(m.messageId);
	return {
		sourceId: id,
		issuer: {
			sourceId: String(m.issuerId),
			name: m.issuerName ?? "",
			ticker: m.issuerSign || null,
			market: marked(m.markets ?? []),
		},
		publishedAt: new Date(m.publishedTime).toISOString(),
		title: m.title,
		category: KATEGORIER[m.category?.[0]?.id ?? -1] ?? "unknown",
		corrects: m.correctionForMessageId ? String(m.correctionForMessageId) : null,
		correctedBy: m.correctedByMessageId ? String(m.correctedByMessageId) : null,
		attachmentCount: m.numbAttachments ?? 0,
		url: `${WEB}/${id}`,
	};
}

function marked(mics: string[]): Market {
	const treff = mics.map((mic) => MARKEDER[mic] ?? "other");
	for (const kandidat of MARKEDSPRIORITET) {
		if (treff.includes(kandidat)) return kandidat;
	}
	return "other";
}

function dag(d: Date): string {
	return d.toISOString().slice(0, 10);
}
