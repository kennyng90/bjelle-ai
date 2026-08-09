import { vi } from "vitest";
import listeRaw from "./fixtures/newsweb/liste.json?raw";

/**
 * Utgående HTTP fanges på nettverksgrensen. Alt annet i testene er ekte: D1, R2
 * og køene kjører i Miniflare, og workeren kjører i workerd.
 */
export type Rute = (url: URL, init: RequestInit | undefined) => Response | undefined;

export interface Nettverk {
	/** Hver URL workeren forsøkte å hente, i rekkefølge. */
	kall: string[];
}

export function stubbHttp(...ruter: Rute[]): Nettverk {
	const nettverk: Nettverk = { kall: [] };

	vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = new URL(input instanceof Request ? input.url : String(input));
		nettverk.kall.push(url.toString());
		for (const rute of ruter) {
			const svar = rute(url, init);
			if (svar) return svar;
		}
		// Et ustubbet kall er en testfeil, ikke en nettverksfeil. Ellers ser en
		// glemt stubb ut som at kilden var nede.
		throw new Error(`ustubbet utgående kall: ${url}`);
	});

	return nettverk;
}

const MELDINGER: Record<string, string> = Object.fromEntries(
	Object.entries(
		import.meta.glob("./fixtures/newsweb/melding/*.json", {
			query: "?raw",
			import: "default",
			eager: true,
		}) as Record<string, string>,
	).map(([sti, innhold]) => [sti.split("/").pop()?.split("-")[0] ?? "", innhold]),
);

/** Alle meldingsidentifikatorene det finnes en ekte fixture for. */
export const FIXTURE_IDER = Object.keys(MELDINGER);

export interface NewswebStubb {
	/** Meldingene kilden skal returnere i lista. Utelatt betyr alle fixtures. */
	ider?: string[];
	/** Kilden hadde flere treff enn den ville returnere. */
	overflow?: boolean;
	/** Erstatter listepayloaden i sin helhet, for å etterligne formatendring. */
	listeBody?: string;
	/** Feilkode kilden svarer med på lista. */
	listeStatus?: number;
	/** Feilkode kilden svarer med på enkeltmeldinger. */
	meldingStatus?: number;
	/**
	 * Endrer en ekte fixture før den serveres, i både lista og enkeltmeldingen.
	 * For tilfeller kilden ikke produserer i dag - en kategori vi ikke kjenner
	 * ennå er nettopp en slik.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: rå payload, testen vet hva den endrer
	varianter?: Record<string, (melding: any) => void>;
}

export function newsweb(stubb: NewswebStubb = {}): Rute {
	return (url) => {
		if (url.hostname !== "api3.oslo.oslobors.no") return undefined;

		if (url.pathname.endsWith("/list")) {
			if (stubb.listeStatus) return new Response("nei", { status: stubb.listeStatus });
			return json(stubb.listeBody ?? listePayload(stubb));
		}

		if (url.pathname.endsWith("/message")) {
			if (stubb.meldingStatus) return new Response("nei", { status: stubb.meldingStatus });
			const id = url.searchParams.get("messageId") ?? "";
			const melding = MELDINGER[id];
			if (!melding) return new Response("ukjent melding", { status: 404 });
			const variant = stubb.varianter?.[id];
			if (!variant) return json(melding);
			const endret = JSON.parse(melding);
			variant(endret.data.message);
			return json(JSON.stringify(endret));
		}

		if (url.pathname.endsWith("/attachment")) {
			const id = url.searchParams.get("attachmentId") ?? "";
			return new Response(`%PDF-1.4 vedlegg ${id}`, {
				headers: { "content-type": "application/pdf" },
			});
		}

		return undefined;
	};
}

export interface AnthropicStubb {
	/** Svaret modellen skal gi, slik det ville kommet gjennom skjemaet. */
	// biome-ignore lint/suspicious/noExplicitAny: testen former svaret fritt, også ugyldige varianter
	svar?: any;
	/** Feilkode modellen svarer med i stedet. */
	status?: number;
	/** stop_reason på svaret. Brukes til å etterligne avslag og avkorting. */
	stopReason?: string;
	/** Hver forespørsel som ble sendt til modellen. */
	kall?: unknown[];
}

/**
 * Anthropic fanges på nettverksgrensen som alt annet utgående. Vi stubber ikke
 * SDK-en: da ville testene bevist at vi kan kalle vår egen mock, ikke at
 * forespørselen faktisk har den formen API-et krever.
 */
export function anthropic(stubb: AnthropicStubb = {}): Rute {
	return (url, init) => {
		if (url.hostname !== "api.anthropic.com") return undefined;
		if (stubb.status) return new Response('{"error":{"message":"nei"}}', { status: stubb.status });

		stubb.kall?.push(init?.body ? JSON.parse(String(init.body)) : null);

		return json(
			JSON.stringify({
				id: "msg_test",
				type: "message",
				role: "assistant",
				model: "claude-sonnet-5",
				content: [{ type: "text", text: JSON.stringify(stubb.svar ?? {}) }],
				stop_reason: stubb.stopReason ?? "end_turn",
				stop_sequence: null,
				usage: { input_tokens: 1200, output_tokens: 300 },
			}),
		);
	};
}

/** Ekte listepayload fra kilden, filtrert til de meldingene testen bryr seg om. */
function listePayload(stubb: NewswebStubb): string {
	const konvolutt = JSON.parse(listeRaw);
	if (stubb.ider) {
		const ønsket = new Set(stubb.ider);
		konvolutt.data.messages = konvolutt.data.messages.filter((m: { messageId: number }) =>
			ønsket.has(String(m.messageId)),
		);
	}
	for (const m of konvolutt.data.messages) {
		stubb.varianter?.[String(m.messageId)]?.(m);
	}
	konvolutt.data.overflow = stubb.overflow ?? false;
	return JSON.stringify(konvolutt);
}

function json(body: string): Response {
	return new Response(body, { headers: { "content-type": "application/json" } });
}
