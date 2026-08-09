import {
	createExecutionContext,
	createMessageBatch,
	createScheduledController,
	getQueueResult,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import { expect, it } from "vitest";
import worker from "../src/index.ts";
import type { EnrichmentJob } from "../src/ingest.ts";
import { anthropic, newsweb, stubbHttp } from "./stubber.ts";

// 679228, innsideinformasjon fra Nordic Rutile. Brødteksten er på norsk og
// inneholder tallene sitatene under er hentet fra.
const INNSIDE = "679228";
// 679273, tilbakekjøp av egne aksjer. Kildekategorien er alltid støy.
const EGNE_AKSJER = "679273";

// Bevisst ingen unstubAllGlobals her. Miniflare leverer kømeldinger til
// konsumenten i bakgrunnen, og et utgående kall uten stubb ville da støyet ut
// av en test som for lengst er ferdig. Hver test setter sin egen stubb.

/** Et gyldig modellsvar. Testene endrer det de bryr seg om. */
function modellsvar(overstyringer: Record<string, unknown> = {}) {
	return {
		category: "refinancing",
		importance: "important",
		what_happened:
			"Selskapet utsetter en rentebetaling og har fått långiverne med på å lempe på lånevilkårene. Det henter samtidig inn kortsiktig finansiering.",
		figures: [],
		terms: ["refinansiering"],
		unknown_terms: [],
		...overstyringer,
	};
}

async function lagre(id: string): Promise<void> {
	stubbHttp(newsweb({ ider: [id] }));
	const ctrl = createScheduledController({
		scheduledTime: new Date("2026-08-08T14:00:00Z"),
		cron: "*/5 * * * *",
	});
	await worker.scheduled(ctrl, env);
}

async function berik(id: string, kø = "bjelle-enrichment") {
	const batch = createMessageBatch(kø, [
		{ id: `kø-${id}`, timestamp: new Date(1000), attempts: 1, body: { messageId: id } },
	]) as MessageBatch<EnrichmentJob>;
	// Konsumenten venter på alt den setter i gang selv, så den trenger ingen
	// ExecutionContext. getQueueResult krever likevel en for å lese ack og retry.
	const ctx = createExecutionContext();
	await worker.queue(batch, env);
	return getQueueResult(batch, ctx);
}

it("beriker en lagret melding med klarspråk-sammendrag og ordlistetreff", async () => {
	await lagre(INNSIDE);
	stubbHttp(anthropic({ svar: modellsvar() }));

	await berik(INNSIDE);

	const rad = await env.DB.prepare(
		"SELECT category, importance, what_happened, model, prompt_hash, discarded_figures FROM enrichment WHERE message_id = ?",
	)
		.bind(INNSIDE)
		.first();

	expect(rad).toMatchObject({
		category: "refinancing",
		importance: "important",
		model: "claude-sonnet-5",
		discarded_figures: 0,
	});
	expect((rad as { what_happened: string }).what_happened).toContain("rentebetaling");
	// Modellversjon og prompt-hash på hver rad er det som gjør en omkjøring målbar.
	expect((rad as { prompt_hash: string }).prompt_hash).toMatch(/^[0-9a-f]{16}$/);

	const melding = await env.DB.prepare("SELECT state FROM message WHERE source_id = ?")
		.bind(INNSIDE)
		.first();
	expect(melding).toMatchObject({ state: "enriched" });

	const treff = await env.DB.prepare(
		"SELECT term FROM term_hit JOIN enrichment ON enrichment.id = term_hit.enrichment_id WHERE message_id = ?",
	)
		.bind(INNSIDE)
		.all<{ term: string }>();
	expect(treff.results.map((r) => r.term)).toEqual(["refinansiering"]);
});

it("forkaster et tall med oppdiktet sitat og publiserer resten av sammendraget", async () => {
	await lagre(INNSIDE);
	stubbHttp(
		anthropic({
			svar: modellsvar({
				figures: [
					{
						// Står ordrett i brødteksten.
						label: "utsatt rentebetaling",
						value: "46.2",
						unit: "millioner NOK",
						quote: "The cash coupon due 9 August 2026 (NOK 46.2 million) is deferred",
					},
					{
						// Finnes ikke i meldingen. Skal forkastes i sin helhet.
						label: "emisjonsbeløp",
						value: "450000000",
						unit: "NOK",
						quote: "en emisjon på NOK 450 000 000 ble besluttet",
					},
				],
			}),
		}),
	);

	await berik(INNSIDE);

	const rad = await env.DB.prepare(
		"SELECT figures, discarded_figures, what_happened FROM enrichment WHERE message_id = ?",
	)
		.bind(INNSIDE)
		.first<{ figures: string; discarded_figures: number; what_happened: string }>();

	const tall = JSON.parse(rad?.figures ?? "[]");
	expect(tall).toHaveLength(1);
	expect(tall[0].label).toBe("utsatt rentebetaling");
	expect(rad?.discarded_figures).toBe(1);
	// Resten av sammendraget publiseres. Ett dårlig tall skal ikke koste hele meldingen.
	expect(rad?.what_happened).toContain("rentebetaling");
});

it("godtar et tall skrevet med hardt mellomrom, slik kilden faktisk skriver dem", async () => {
	// Uten normaliseringen forkastes et tall som står ordrett i meldingen, og
	// forkastningsraten måler parseren vår i stedet for prompten.
	await lagre(INNSIDE);
	const brødtekst = await env.DB.prepare("SELECT body FROM message WHERE source_id = ?")
		.bind(INNSIDE)
		.first<{ body: string }>();
	const utdrag = (brødtekst?.body ?? "").slice(0, 60).replace(/ /g, " ");

	stubbHttp(
		anthropic({
			svar: modellsvar({
				figures: [{ label: "utdrag", value: "1", unit: "stk", quote: utdrag }],
			}),
		}),
	);

	await berik(INNSIDE);

	const rad = await env.DB.prepare("SELECT discarded_figures FROM enrichment WHERE message_id = ?")
		.bind(INNSIDE)
		.first();
	expect(rad).toMatchObject({ discarded_figures: 0 });
});

it("godtar et sitat der tankestreken er skrevet som bindestrek", async () => {
	// Tankestrek er ikke et blanktegn, så den trenger sin egen regel. Kilden
	// bruker den midt i setninger: "Liquidity covenant – temporary waiver".
	await lagre(INNSIDE);
	stubbHttp(
		anthropic({
			svar: modellsvar({
				figures: [
					{
						label: "likviditetsvilkår",
						value: "0",
						unit: "stk",
						quote: "Liquidity covenant - temporary waiver",
					},
				],
			}),
		}),
	);

	await berik(INNSIDE);

	const rad = await env.DB.prepare("SELECT discarded_figures FROM enrichment WHERE message_id = ?")
		.bind(INNSIDE)
		.first();
	expect(rad).toMatchObject({ discarded_figures: 0 });
});

it("holder en emisjon viktig selv når modellen sier støy", async () => {
	// Kildekategorien innsideinformasjon har gulv og tak på important. Modellens
	// skjønn klemmes inn i det, og at den ble overkjørt lagres.
	await lagre(INNSIDE);
	stubbHttp(anthropic({ svar: modellsvar({ category: "share_issue", importance: "noise" }) }));

	await berik(INNSIDE);

	const rad = await env.DB.prepare(
		"SELECT importance, clamped_from FROM message WHERE source_id = ?",
	)
		.bind(INNSIDE)
		.first();
	expect(rad).toMatchObject({ importance: "important", clamped_from: "noise" });
});

it("holder en ren formalitet som støy selv når modellen sier viktig", async () => {
	await lagre(EGNE_AKSJER);
	stubbHttp(
		anthropic({ svar: modellsvar({ category: "share_buyback", importance: "important" }) }),
	);

	await berik(EGNE_AKSJER);

	const rad = await env.DB.prepare(
		"SELECT importance, clamped_from FROM message WHERE source_id = ?",
	)
		.bind(EGNE_AKSJER)
		.first();
	expect(rad).toMatchObject({ importance: "noise", clamped_from: "important" });
});

it("samler opp begreper modellen møtte, men ikke fant i ordlista", async () => {
	await lagre(INNSIDE);
	stubbHttp(
		anthropic({
			svar: modellsvar({ unknown_terms: ["covenant waiver", "Covenant Waiver"] }),
		}),
	);

	await berik(INNSIDE);

	const rad = await env.DB.prepare("SELECT term, occurrences FROM unknown_term").all<{
		term: string;
		occurrences: number;
	}>();
	// Samme begrep i to skrivemåter er ett begrep å skrive forklaring for.
	expect(rad.results).toEqual([{ term: "covenant waiver", occurrences: 1 }]);
});

it("regner et arvet objektfelt som ukjent begrep, ikke som ordlistetreff", async () => {
	// GLOSSARY er et vanlig objekt, så "toString" og "constructor" finnes på
	// prototypen. Slipper de gjennom som kjente begreper, vises de som noe vi
	// kan forklare - og det finnes ingen forklaring.
	await lagre(INNSIDE);
	stubbHttp(anthropic({ svar: modellsvar({ terms: ["toString", "refinansiering"] }) }));

	await berik(INNSIDE);

	const treff = await env.DB.prepare(
		"SELECT term FROM term_hit JOIN enrichment ON enrichment.id = term_hit.enrichment_id WHERE message_id = ?",
	)
		.bind(INNSIDE)
		.all<{ term: string }>();
	expect(treff.results.map((r) => r.term)).toEqual(["refinansiering"]);

	const ukjent = await env.DB.prepare("SELECT term FROM unknown_term").all<{ term: string }>();
	expect(ukjent.results.map((r) => r.term)).toEqual(["tostring"]);
});

it("lar meldingen være lesbar når språkmodellen svarer med feil", async () => {
	await lagre(INNSIDE);
	stubbHttp(anthropic({ status: 500 }));

	const resultat = await berik(INNSIDE);

	// Forsøket legges tilbake i køen, ikke forkastes.
	expect(resultat.retryMessages).toHaveLength(1);

	const rad = await env.DB.prepare(
		"SELECT state, title, importance, source_url FROM message WHERE source_id = ?",
	)
		.bind(INNSIDE)
		.first();

	// Kjerneløftet: tittel, viktighet og lenke finnes selv om modellen var nede.
	expect(rad).toMatchObject({
		state: "enrichment_failed",
		importance: "important",
		source_url: "https://newsweb.oslobors.no/message/679228",
	});
	expect((rad as { title: string }).title).toContain("Nordic Rutile");
});

it("gir opp etter tre forsøk og setter meldingen i dødbrevtilstand", async () => {
	await lagre(INNSIDE);
	stubbHttp(anthropic({ status: 500 }));

	// To forsøk er allerede brukt. Forsøkstelleren settes her i stedet for å
	// leveres opp: Miniflare leverer også kømeldinger til konsumenten på egen
	// hånd mens testen kjører, og da blir antall leveringer ikke vårt å bestemme.
	// Terskelen er likevel eksakt - det er den som testes.
	await env.DB.prepare("UPDATE message SET attempts = 2 WHERE source_id = ?").bind(INNSIDE).run();

	const siste = await berik(INNSIDE);

	// Tredje forsøk legges ikke tilbake i køen. Uten dette ville en giftig
	// melding brukt opp kapasitet i det uendelige.
	expect(siste.retryMessages).toHaveLength(0);

	const rad = await env.DB.prepare("SELECT state, attempts FROM message WHERE source_id = ?")
		.bind(INNSIDE)
		.first<{ state: string; attempts: number }>();
	expect(rad?.state).toBe("dead_letter");
	expect(rad?.attempts).toBeGreaterThanOrEqual(3);
});

it("setter dødbrevtilstand på meldinger køen selv ga opp på", async () => {
	await lagre(INNSIDE);
	stubbHttp(anthropic({ svar: modellsvar() }));

	await berik(INNSIDE, "bjelle-enrichment-dlq");

	const rad = await env.DB.prepare("SELECT state FROM message WHERE source_id = ?")
		.bind(INNSIDE)
		.first();
	expect(rad).toMatchObject({ state: "dead_letter" });
});

it("sender kildens brødtekst og et lukket skjema til modellen", async () => {
	const kall: unknown[] = [];
	await lagre(INNSIDE);
	stubbHttp(anthropic({ svar: modellsvar(), kall }));

	await berik(INNSIDE);

	const forespørsel = kall[0] as {
		model: string;
		system: string;
		output_config: { format: { schema: { properties: Record<string, unknown> } } };
		messages: { content: string }[];
	};

	expect(forespørsel.model).toBe("claude-sonnet-5");
	expect(forespørsel.messages[0]?.content).toContain("Nordic Rutile");

	// Skjemaet er grensen som gjør investeringsråd strukturelt umulig. Ryker den,
	// finnes det plutselig et sted å skrive råd.
	const felter = Object.keys(forespørsel.output_config.format.schema.properties);
	expect(felter.sort()).toEqual([
		"category",
		"figures",
		"importance",
		"terms",
		"unknown_terms",
		"what_happened",
	]);
});
