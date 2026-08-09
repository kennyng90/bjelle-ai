import { createScheduledController } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { expect, it } from "vitest";
import worker from "../src/index.ts";
import { anthropic, newsweb, stubbHttp } from "./stubber.ts";

const POLL = "*/5 * * * *";
const BACKFILL = "7,22,37,52 * * * *";
const SELSKAP = "23 4 * * *";

// En torsdag midt i børsens åpningstid.
const ÅPEN = new Date("2026-08-06T12:00:00Z");

async function kjør(cron: string, tid = ÅPEN): Promise<void> {
	await worker.scheduled(createScheduledController({ scheduledTime: tid, cron }), env);
}

it("henter historikk bakover uten å blokkere pollingen", async () => {
	stubbHttp(newsweb(), anthropic({ svar: {} }));

	await kjør(BACKFILL);

	const framdrift = await env.DB.prepare(
		"SELECT window_from, window_to, finished FROM backfill_progress WHERE id = 1",
	).first<{ window_from: string; window_to: string; finished: number }>();

	expect(framdrift).not.toBeNull();
	expect(framdrift?.finished).toBe(0);
	// Backfillen starter der pollingens døgnvindu slutter og går bakover.
	expect(new Date(framdrift?.window_to ?? 0).getTime()).toBeLessThan(ÅPEN.getTime());

	const kjøringer = await env.DB.prepare(
		"SELECT COUNT(*) AS n FROM run WHERE kind = 'backfill'",
	).first<{ n: number }>();
	expect(kjøringer?.n).toBeGreaterThan(0);
});

it("gjenopptar backfillen der den slapp, uten hull og uten dubletter", async () => {
	stubbHttp(newsweb(), anthropic({ svar: {} }));

	await kjør(BACKFILL);
	const etterFørste = await env.DB.prepare(
		"SELECT window_from FROM backfill_progress WHERE id = 1",
	).first<{ window_from: string }>();

	// Neste kjøring er en helt ny invokasjon. Framdriften er det eneste som
	// bindes sammen, og den ligger i databasen.
	await kjør(BACKFILL);
	const etterAndre = await env.DB.prepare(
		"SELECT window_from FROM backfill_progress WHERE id = 1",
	).first<{ window_from: string }>();

	expect(new Date(etterAndre?.window_from ?? 0).getTime()).toBeLessThan(
		new Date(etterFørste?.window_from ?? 0).getTime(),
	);

	// Meldingene fra fixturene er hentet uansett hvor mange ganger vi kjørte.
	const dubletter = await env.DB.prepare(
		"SELECT source_id, COUNT(*) AS n FROM message GROUP BY source_id HAVING n > 1",
	).all();
	expect(dubletter.results).toEqual([]);
});

it("går ikke videre fra en bit der ingen meldinger lot seg hente", async () => {
	// Kilden svarer på lista, men ikke på enkeltmeldingene. Null lagret betyr
	// her "kilden sviktet", ikke "biten er tom". Går backfillen videre nå, er
	// meldingene tapt for godt: den går bare bakover og ser aldri biten igjen.
	stubbHttp(newsweb({ meldingStatus: 502 }));

	await kjør(BACKFILL);
	const første = await env.DB.prepare(
		"SELECT window_from, stalled FROM backfill_progress WHERE id = 1",
	).first<{ window_from: string; stalled: number }>();

	await kjør(BACKFILL);
	const andre = await env.DB.prepare(
		"SELECT window_from, stalled FROM backfill_progress WHERE id = 1",
	).first<{ window_from: string; stalled: number }>();

	// Samme vindu, og telleren for kjøringer uten framgang stiger.
	expect(andre?.window_from).toBe(første?.window_from);
	expect(andre?.stalled).toBeGreaterThan(første?.stalled ?? 0);
});

it("gir opp en bit til slutt, men bråker først", async () => {
	// Uten taket ville backfillen stått fast for alltid på én giftig melding.
	stubbHttp(newsweb({ meldingStatus: 502 }));
	const feil: unknown[] = [];
	const opprinnelig = console.error;
	console.error = (...args: unknown[]) => feil.push(args[0]);

	let start: string | undefined;
	try {
		await kjør(BACKFILL);
		start = (
			await env.DB.prepare("SELECT window_from FROM backfill_progress WHERE id = 1").first<{
				window_from: string;
			}>()
		)?.window_from;
		for (let i = 0; i < 3; i++) await kjør(BACKFILL);
	} finally {
		console.error = opprinnelig;
	}

	// Den ga opp høyt. En bit vi hopper over er noe noen må se på.
	expect(feil.some((f) => (f as { hendelse?: string })?.hendelse === "backfill_ga_opp_bit")).toBe(
		true,
	);

	// Og den står ikke fast: vinduet har flyttet seg bakover.
	const nå = await env.DB.prepare("SELECT window_from FROM backfill_progress WHERE id = 1").first<{
		window_from: string;
	}>();
	expect(new Date(nå?.window_from ?? 0).getTime()).toBeLessThan(new Date(start ?? 0).getTime());
});

it("slår alarm på en polling som ble avbrutt uten å skrive feil", async () => {
	// En kjøring drept av CPU-grensen rekker aldri å skrive noe i error. Uten
	// denne sjekken ser den ut som en helt vanlig stille kjøring.
	await env.DB.prepare(
		"INSERT INTO run (kind, started_at, finished_at, error) VALUES ('poll', ?, NULL, NULL)",
	)
		.bind(new Date(Date.now() - 60 * 60 * 1000).toISOString())
		.run();

	const svar = await worker.fetch(
		new Request("https://bjelle.test/operator/status", {
			headers: { authorization: "Bearer test-operator" },
		}),
		env,
	);
	const status = (await svar.json()) as { health: { alarm: boolean; reasons: string[] } };

	expect(status.health.alarm).toBe(true);
	expect(status.health.reasons.join(" ")).toMatch(/avbrutt/);
});

it("lagrer meldinger eldre enn tre måneder uten å berike dem", async () => {
	// Backfillen lagrer hele året, men bare de siste tre månedene skal koste
	// språkmodellkall. Resten berikes ved første lesing.
	stubbHttp(newsweb(), anthropic({ svar: {} }));

	// Nok kjøringer til at vinduet passerer 666818, publisert 25. februar 2026 -
	// godt over tre måneder før tidspunktet testen later som det er.
	for (let i = 0; i < 20; i++) await kjør(BACKFILL);

	const gammel = await env.DB.prepare(
		"SELECT state, published_at FROM message WHERE source_id = '666818'",
	).first<{ state: string; published_at: string }>();

	// Meldingen finnes - historikken er hentet inn.
	expect(gammel?.published_at.slice(0, 10)).toBe("2026-02-25");
	// Men den står i kø-fri tilstand. Ingen språkmodellkall er brukt på den.
	expect(gammel?.state).toBe("stored");

	// Ferske meldinger i samme backfill er derimot lagt i kø.
	const fersk = await env.DB.prepare("SELECT state FROM message WHERE source_id = '679024'").first<{
		state: string;
	}>();
	expect(fersk?.state).toBe("queued");
});

it("holder selskapslista oppdatert og beholder avnoterte selskaper", async () => {
	stubbHttp(newsweb());

	await kjør(SELSKAP);

	const notert = await env.DB.prepare(
		"SELECT COUNT(*) AS n FROM company WHERE status = 'listed'",
	).first<{ n: number }>();
	const avnotert = await env.DB.prepare(
		"SELECT COUNT(*) AS n FROM company WHERE status = 'delisted'",
	).first<{ n: number }>();

	expect(notert?.n).toBeGreaterThan(0);
	// Avnoterte selskaper står igjen i tabellen. Historikken deres skal ikke
	// forsvinne fordi de sluttet å være notert.
	expect(avnotert?.n).toBeGreaterThan(0);
});

it("registrerer en selskapssynk med endret format som feilet", async () => {
	stubbHttp(newsweb({ utstedereBody: '{"header":{},"data":{"selskaper":[]}}' }));

	await expect(kjør(SELSKAP)).rejects.toThrow(/data.issuers/);

	const rad = await env.DB.prepare(
		"SELECT error FROM run WHERE kind = 'company_sync' ORDER BY id DESC LIMIT 1",
	).first<{ error: string }>();
	expect(rad?.error).toMatch(/SourceFormatError/);
});

it("krever hemmelighet på operatørflaten", async () => {
	const uten = await worker.fetch(new Request("https://bjelle.test/operator/status"), env);
	expect(uten.status).toBe(401);

	const feil = await worker.fetch(
		new Request("https://bjelle.test/operator/status", {
			headers: { authorization: "Bearer feil-token" },
		}),
		env,
	);
	expect(feil.status).toBe(401);
});

it("viser forkastningsrate og kostnad per promptversjon", async () => {
	stubbHttp(newsweb({ ider: ["679228"] }));
	await kjør(POLL);

	stubbHttp(
		anthropic({
			svar: {
				category: "refinancing",
				importance: "important",
				what_happened: "To setninger. Om hva som skjedde.",
				figures: [{ label: "oppdiktet", value: "1", unit: "NOK", quote: "finnes ikke i teksten" }],
				terms: [],
				unknown_terms: ["covenant waiver"],
			},
		}),
	);
	await worker.queue(
		{
			queue: "bjelle-enrichment",
			messages: [
				{
					id: "kø-1",
					timestamp: ÅPEN,
					attempts: 1,
					body: { messageId: "679228" },
					ack: () => {},
					retry: () => {},
				},
			],
			ackAll: () => {},
			retryAll: () => {},
		} as unknown as MessageBatch<{ messageId: string }>,
		env,
	);

	const svar = await worker.fetch(
		new Request("https://bjelle.test/operator/status", {
			headers: { authorization: "Bearer test-operator" },
		}),
		env,
	);
	expect(svar.status).toBe(200);

	const status = (await svar.json()) as {
		enrichmentQuality: { forkastede_tall: number; kostnad_usd: number }[];
		unknownTerms: { term: string }[];
	};

	// Kvalitetsmålet på prompten og kostnaden per beriket melding, begge synlige
	// uten at noen må skrive en spørring for hånd.
	expect(status.enrichmentQuality[0]?.forkastede_tall).toBe(1);
	expect(status.enrichmentQuality[0]?.kostnad_usd).toBeGreaterThan(0);
	expect(status.unknownTerms.map((t) => t.term)).toContain("covenant waiver");
});

it("slår alarm når en polling er registrert med feil", async () => {
	stubbHttp(newsweb({ listeBody: '{"header":{},"data":{}}' }));
	await expect(kjør(POLL)).rejects.toThrow();

	const svar = await worker.fetch(
		new Request("https://bjelle.test/operator/status", {
			headers: { authorization: "Bearer test-operator" },
		}),
		env,
	);
	const status = (await svar.json()) as { health: { alarm: boolean; reasons: string[] } };

	expect(status.health.alarm).toBe(true);
	expect(status.health.reasons.join(" ")).toMatch(/feilet/);
});

it("lar en gammel melding legges i kø på forespørsel", async () => {
	stubbHttp(newsweb({ ider: ["679228"] }));
	await kjør(POLL);
	await env.DB.prepare("UPDATE message SET state = 'stored' WHERE source_id = ?")
		.bind("679228")
		.run();

	const svar = await worker.fetch(
		new Request("https://bjelle.test/operator/enrich?messageId=679228", {
			method: "POST",
			headers: { authorization: "Bearer test-operator" },
		}),
		env,
	);

	expect(svar.status).toBe(200);
	const rad = await env.DB.prepare("SELECT state FROM message WHERE source_id = ?")
		.bind("679228")
		.first();
	expect(rad).toMatchObject({ state: "queued" });
});

it("gir en dødbrevmelding nye forsøk når den kjøres om", async () => {
	// Uten nullstilling ville en melding som har brukt opp forsøkene sine gå
	// rett tilbake til dødbrev, og en omkjøring etter en promptendring ville
	// aldri fått lov til å prøve.
	stubbHttp(newsweb({ ider: ["679228"] }));
	await kjør(POLL);
	await env.DB.prepare("UPDATE message SET state = 'dead_letter', attempts = 3 WHERE source_id = ?")
		.bind("679228")
		.run();

	await worker.fetch(
		new Request("https://bjelle.test/operator/enrich?messageId=679228", {
			method: "POST",
			headers: { authorization: "Bearer test-operator" },
		}),
		env,
	);

	const rad = await env.DB.prepare("SELECT state, attempts FROM message WHERE source_id = ?")
		.bind("679228")
		.first();
	expect(rad).toMatchObject({ state: "queued", attempts: 0 });
});

it("viser sammendraget ved siden av originalteksten for stikkprøver", async () => {
	stubbHttp(newsweb({ ider: ["679228"] }));
	await kjør(POLL);

	const svar = await worker.fetch(
		new Request("https://bjelle.test/operator/sample?messageId=679228", {
			headers: { authorization: "Bearer test-operator" },
		}),
		env,
	);
	const prøve = (await svar.json()) as {
		message: { body: string; source_url: string };
		enrichment: unknown;
	};

	expect(prøve.message.body).toContain("Nordic Rutile");
	expect(prøve.message.source_url).toBe("https://newsweb.oslobors.no/message/679228");
	// Ingen berikelse ennå. Meldingen er lesbar likevel.
	expect(prøve.enrichment).toBeNull();
});
