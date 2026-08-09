import { createScheduledController } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeEach, expect, it, vi } from "vitest";
import worker from "../src/index.ts";
import { newsweb, stubbHttp } from "./stubber.ts";

// Ekte meldinger fra Newsweb. Se test/fixtures/newsweb/LESMEG.md.
const INNSIDE = "679228"; // innsideinformasjon, Nordic Rutile
const PRIMÆRINNSIDER = "679270"; // to vedlegg
const EGNE_AKSJER = "679273"; // alltid støy
const RAPPORT = "678914"; // halvårsrapport, senere rettet
const RETTELSE = "678947"; // retter 678914

beforeEach(() => {
	vi.unstubAllGlobals();
});

// Ingen ExecutionContext: cronen venter på alt den setter i gang selv, slik at
// en kjøring som feiler blir rapportert som feilet av Cloudflare også.
async function kjørPolling(): Promise<void> {
	const ctrl = createScheduledController({
		scheduledTime: new Date("2026-08-08T14:00:00Z"),
		cron: "*/5 * * * *",
	});
	await worker.scheduled(ctrl, env);
}

it("lagrer en ny melding og setter den i kø for berikelse", async () => {
	stubbHttp(newsweb({ ider: [INNSIDE] }));

	await kjørPolling();

	const rad = await env.DB.prepare("SELECT * FROM message WHERE source_id = ?")
		.bind(INNSIDE)
		.first();

	// Meldingen er lesbar med det samme: tittel, selskap, kategori, viktighet og
	// lenke finnes før modellen har sagt et ord. Det er hele produktløftet.
	expect(rad).toMatchObject({
		source_id: INNSIDE,
		title:
			"Nordic Rutile (Engebø Rutile and Garnet AS) – Deferred Coupon, Covenant Waivers, PIK Rate Increase and Short-Term Financing",
		source_category: "inside_information",
		importance: "important",
		state: "queued",
		source_url: "https://newsweb.oslobors.no/message/679228",
	});

	// Selskapet er opprettet av meldingen selv. Et nynotert selskap skal ikke
	// kunne miste sin første melding fordi selskapslista ikke var oppdatert.
	const selskap = await env.DB.prepare("SELECT * FROM company WHERE issuer_id = ?")
		.bind((rad as { issuer_id: string }).issuer_id)
		.first();
	expect(selskap).toMatchObject({ market: "other", status: "listed" });
});

it("gir én rad når samme melding hentes to ganger", async () => {
	stubbHttp(newsweb({ ider: [INNSIDE] }));

	// To kjøringer som ser det samme vinduet. Dette er en overlappende cron.
	await kjørPolling();
	await kjørPolling();

	const antall = await env.DB.prepare("SELECT COUNT(*) AS n FROM message WHERE source_id = ?")
		.bind(INNSIDE)
		.first<{ n: number }>();
	expect(antall?.n).toBe(1);
});

it("lar en ukjent kildekategori lande på greit å vite, aldri på støy", async () => {
	// Kilden legger til kategorier uten forvarsel. En melding vi ikke kjenner
	// kategorien på skal være synlig til noen har sett på den.
	stubbHttp(
		newsweb({
			ider: [INNSIDE],
			varianter: {
				[INNSIDE]: (m) => {
					m.category = [{ id: 1999, category_no: "NY KATEGORI", category_en: "NEW CATEGORY" }];
				},
			},
		}),
	);

	await kjørPolling();

	const rad = await env.DB.prepare(
		"SELECT source_category, importance FROM message WHERE source_id = ?",
	)
		.bind(INNSIDE)
		.first();
	expect(rad).toMatchObject({ source_category: "unknown", importance: "good_to_know" });
});

it("merker en ren formalitet som støy", async () => {
	stubbHttp(newsweb({ ider: [EGNE_AKSJER] }));

	await kjørPolling();

	const rad = await env.DB.prepare("SELECT importance FROM message WHERE source_id = ?")
		.bind(EGNE_AKSJER)
		.first();
	expect(rad).toMatchObject({ importance: "noise" });
});

it("lagrer vedlegg i objektlageret med nøkkelen som står i databasen", async () => {
	stubbHttp(newsweb({ ider: [PRIMÆRINNSIDER] }));

	await kjørPolling();

	const { results } = await env.DB.prepare(
		"SELECT source_id, filename, media_type, r2_key FROM attachment WHERE message_id = ? ORDER BY source_id",
	)
		.bind(PRIMÆRINNSIDER)
		.all<{ source_id: string; filename: string; media_type: string; r2_key: string }>();

	expect(results).toHaveLength(2);
	for (const vedlegg of results) {
		expect(vedlegg.media_type).toBe("application/pdf");
		const objekt = await env.RAW.get(vedlegg.r2_key);
		expect(objekt).not.toBeNull();
		// Kvartalsrapporten skal ikke forsvinne når kilden rydder.
		expect(await objekt?.text()).toContain(vedlegg.source_id);
	}
});

it("lagrer kildens rådata slik den kom, så parsingen kan kjøres om", async () => {
	stubbHttp(newsweb({ ider: [INNSIDE] }));

	await kjørPolling();

	const rad = await env.DB.prepare("SELECT raw_key FROM message WHERE source_id = ?")
		.bind(INNSIDE)
		.first<{ raw_key: string }>();
	const rått = await env.RAW.get(rad?.raw_key ?? "");
	expect(rått).not.toBeNull();

	// Selve poenget: rålageret er komplett nok til å tolke meldingen på nytt,
	// også med en parser vi ikke har skrevet ennå.
	const payload = JSON.parse(await (rått as R2ObjectBody).text());
	expect(payload.data.message.messageId).toBe(Number(INNSIDE));
	expect(payload.data.message.body).toContain("Nordic Rutile");
});

it("peker en rettet melding framover til rettelsen", async () => {
	// Originalen kommer først, i sin egen kjøring. Uten framoverpekeren måtte en
	// feed skanne hele tabellen for å vite at meldingen er utdatert.
	stubbHttp(newsweb({ ider: [RAPPORT] }));
	await kjørPolling();

	stubbHttp(newsweb({ ider: [RAPPORT, RETTELSE] }));
	await kjørPolling();

	const original = await env.DB.prepare("SELECT corrected_by FROM message WHERE source_id = ?")
		.bind(RAPPORT)
		.first();
	const rettelse = await env.DB.prepare("SELECT corrects FROM message WHERE source_id = ?")
		.bind(RETTELSE)
		.first();

	expect(original).toMatchObject({ corrected_by: RETTELSE });
	expect(rettelse).toMatchObject({ corrects: RAPPORT });
});

it("registrerer en kjøring med endret kildeformat som feilet, ikke som tom", async () => {
	// Den stille feilen som må bråke. Uten dette ser en kilde som har lagt om
	// formatet ut som en helt vanlig stille dag på børsen.
	stubbHttp(newsweb({ listeBody: '{"header":{"http.code":200},"data":{"items":[]}}' }));

	await expect(kjørPolling()).rejects.toThrow(/data.messages/);

	const kjøring = await env.DB.prepare("SELECT * FROM run ORDER BY id DESC LIMIT 1").first();
	expect(kjøring).toMatchObject({ kind: "poll", found: 0, stored: 0 });
	expect((kjøring as { error: string }).error).toMatch(/SourceFormatError/);
});

it("teller hva kjøringen fant og hva den lagret", async () => {
	stubbHttp(newsweb({ ider: [INNSIDE, EGNE_AKSJER] }));

	await kjørPolling();
	await kjørPolling();

	const { results } = await env.DB.prepare(
		"SELECT found, stored, error FROM run WHERE kind = 'poll' ORDER BY id",
	).all<{ found: number; stored: number; error: string | null }>();

	// Andre kjøring finner det samme, men lagrer ingenting. Det er den normale
	// stille kjøringen, og den skal ikke se ut som en feil.
	expect(results).toEqual([
		{ found: 2, stored: 2, error: null },
		{ found: 2, stored: 0, error: null },
	]);
});
