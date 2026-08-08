/**
 * Bakgrunnsjobber for Bjelle.
 *
 * Ansvar (jf. docs/CONCEPT.md):
 *  - polle Newsweb for nye børsmeldinger
 *  - hente shortposisjoner fra Finanstilsynets åpne API
 *  - oppsummere meldinger i klarspråk med en LLM
 *  - dytte varsler til brukere som følger selskapet
 *
 * Env-typen genereres av `pnpm --filter @bjelle/workers cf-typegen`.
 */
export default {
	async fetch(request) {
		const url = new URL(request.url);

		if (url.pathname === "/health") {
			return Response.json({ status: "ok" });
		}

		return new Response("Not found", { status: 404 });
	},

	async scheduled(controller, _env, ctx) {
		ctx.waitUntil(pollNewsweb(controller.scheduledTime));
	},
} satisfies ExportedHandler<Env>;

async function pollNewsweb(scheduledTime: number): Promise<void> {
	// TODO: hent nye meldinger siden forrige kjøring, oppsummer, varsle.
	// Sjekk Euronext/Newsweb sine vilkår for videredistribusjon før dette går live.
	console.log(`Newsweb-polling planlagt ${new Date(scheduledTime).toISOString()}`);
}
