/**
 * Inntakstjenesten for Bjelle.
 *
 * Tre inngangspunkter, med hver sin harde regel:
 *  - `scheduled`: poll kilden, lagre rått, sett viktighet, legg i kø. Aldri
 *    språkmodellkall her, og alltid ferdig raskt.
 *  - `queue`: berik én melding om gangen, med begrensede forsøk og dødbrevkø.
 *  - `fetch`: helsesjekk og operatørendepunkter. Ingen offentlig flate ennå.
 *
 * Env-typen genereres av `pnpm --filter @bjelle/workers cf-typegen`.
 */
import { ingest } from "./ingest.ts";
import { NewswebSource } from "./source/newsweb.ts";

/** Cron-uttrykket som styrer den løpende pollingen. */
const POLL_CRON = "*/5 * * * *";

/**
 * Hvor langt tilbake pollingen ser. Kilden er dagsgranulær, så et døgn er det
 * minste vinduet som ikke mister meldinger publisert like før midnatt.
 */
const POLL_VINDU_MS = 24 * 60 * 60 * 1000;

export default {
	async fetch(request) {
		const url = new URL(request.url);

		if (url.pathname === "/health") {
			return Response.json({ status: "ok" });
		}

		return new Response("Not found", { status: 404 });
	},

	async scheduled(controller, env) {
		const now = new Date(controller.scheduledTime);

		if (controller.cron === POLL_CRON) {
			// Bevisst ikke i waitUntil: en kjøring som feiler skal rapporteres som
			// feilet av Cloudflare også, ikke bare i run-tabellen.
			await ingest(
				env,
				new NewswebSource(),
				"poll",
				{
					from: new Date(now.getTime() - POLL_VINDU_MS),
					to: now,
				},
				now,
			);
		}
	},
} satisfies ExportedHandler<Env>;
