import { checkHealth } from "./health.ts";
import type { EnrichmentJob } from "./ingest.ts";
import { resetAttempts, setState } from "./store.ts";

/**
 * Operatørflaten. Ingen offentlig flate i dette steget: alt her er verktøy for
 * den som drifter tjenesten.
 *
 * Endepunktene koster penger å kalle - en omkjøring av berikelsen er et
 * språkmodellkall per melding - så de ligger bak en hemmelighet. Uten den ville
 * hvem som helst kunne tømme budsjettet.
 */
export async function handleOperator(request: Request, env: Env): Promise<Response | null> {
	const url = new URL(request.url);
	if (!url.pathname.startsWith("/operator/")) return null;

	if (!autorisert(request, env)) {
		return Response.json({ error: "ikke autorisert" }, { status: 401 });
	}

	if (url.pathname === "/operator/status" && request.method === "GET") {
		return Response.json(await status(env));
	}

	// Kjører berikelsen om igjen. Brukes til å måle en promptendring mot ekte
	// data, og til å berike en gammel melding første gang noen leser den.
	if (url.pathname === "/operator/enrich" && request.method === "POST") {
		const ider = url.searchParams.getAll("messageId");
		if (ider.length === 0) {
			return Response.json({ error: "messageId mangler" }, { status: 400 });
		}
		await env.ENRICHMENT.sendBatch(
			ider.map((messageId) => ({ body: { messageId } satisfies EnrichmentJob })),
		);
		// Forsøkstelleren nullstilles. Uten det ville en melding som har brukt opp
		// forsøkene sine gå rett tilbake til dødbrev, og en omkjøring etter en
		// promptendring ville aldri fått lov til å prøve.
		await resetAttempts(env.DB, ider);
		await setState(env.DB, ider, "queued");
		return Response.json({ queued: ider });
	}

	// Stikkprøve: sammendraget ved siden av originalteksten det er laget fra.
	if (url.pathname === "/operator/sample" && request.method === "GET") {
		const id = url.searchParams.get("messageId");
		if (!id) return Response.json({ error: "messageId mangler" }, { status: 400 });
		const prøve = await sample(env, id);
		if (!prøve) return Response.json({ error: "ukjent melding" }, { status: 404 });
		return Response.json(prøve);
	}

	return Response.json({ error: "ukjent endepunkt" }, { status: 404 });
}

function autorisert(request: Request, env: Env): boolean {
	const oppgitt = request.headers.get("authorization");
	if (!oppgitt || !env.OPERATOR_TOKEN) return false;
	// Konstant tidsbruk er overkill for en driftsflate med én bruker, men
	// lengdesjekken først gjør sammenligningen billig og forutsigbar.
	const forventet = `Bearer ${env.OPERATOR_TOKEN}`;
	return oppgitt.length === forventet.length && oppgitt === forventet;
}

async function status(env: Env) {
	const [helse, tilstander, kvalitet, ukjente, kjøringer] = await Promise.all([
		checkHealth(env.DB, new Date()),
		env.DB.prepare("SELECT state, COUNT(*) AS antall FROM message GROUP BY state").all(),
		// Forkastningsraten regnes per prompt-hash, over gjeldende prompt alene.
		// Ellers drukner effekten av en promptendring i historikken.
		env.DB.prepare(
			`SELECT prompt_hash, model, COUNT(*) AS berikelser,
			        SUM(discarded_figures) AS forkastede_tall,
			        ROUND(SUM(cost_usd), 4) AS kostnad_usd,
			        ROUND(AVG(cost_usd), 6) AS kostnad_per_melding_usd
			 FROM enrichment GROUP BY prompt_hash, model ORDER BY prompt_hash`,
		).all(),
		env.DB.prepare(
			"SELECT term, occurrences FROM unknown_term ORDER BY occurrences DESC, term LIMIT 25",
		).all(),
		env.DB.prepare(
			"SELECT kind, started_at, found, stored, duration_ms, error FROM run ORDER BY id DESC LIMIT 10",
		).all(),
	]);

	return {
		health: helse,
		messagesByState: tilstander.results,
		enrichmentQuality: kvalitet.results,
		unknownTerms: ukjente.results,
		recentRuns: kjøringer.results,
	};
}

async function sample(env: Env, messageId: string) {
	const melding = await env.DB.prepare(
		"SELECT source_id, title, body, source_category, importance, clamped_from, state, source_url FROM message WHERE source_id = ?",
	)
		.bind(messageId)
		.first();
	if (!melding) return null;

	const berikelse = await env.DB.prepare(
		"SELECT category, importance, what_happened, figures, discarded_figures, model, prompt_hash, created_at FROM enrichment WHERE message_id = ? ORDER BY id DESC LIMIT 1",
	)
		.bind(messageId)
		.first<{ figures: string }>();

	return {
		message: melding,
		enrichment: berikelse ? { ...berikelse, figures: JSON.parse(berikelse.figures) } : null,
	};
}
