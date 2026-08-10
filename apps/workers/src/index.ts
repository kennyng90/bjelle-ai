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
import { backfill } from "./backfill.ts";
import { syncCompanies } from "./companies.ts";
import { checkHealth } from "./health.ts";
import type { EnrichmentJob } from "./ingest.ts";
import { ingest } from "./ingest.ts";
import { handleOperator } from "./operator.ts";
import { handleQueue } from "./queue.ts";
import { NewswebSource } from "./source/newsweb.ts";

/** Den løpende pollingen. */
const POLL_CRON = "*/5 * * * *";
/** Backfill av historikk. Egen rytme, slik at den aldri stopper sanntidsdelen. */
const BACKFILL_CRON = "7,22,37,52 * * * *";
/** Selskapslista. Endrer seg sjelden. */
const SELSKAP_CRON = "23 4 * * *";

/**
 * Hvor langt tilbake pollingen ser. Kilden er dagsgranulær, så et døgn er det
 * minste vinduet som ikke mister meldinger publisert like før midnatt.
 */
const POLL_VINDU_MS = 24 * 60 * 60 * 1000;

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		if (url.pathname === "/health") {
			// Liveness alene. Om inntaket faktisk fungerer står i helserapporten,
			// og den hører hjemme bak operatørflaten.
			return Response.json({ status: "ok" });
		}

		const operatør = await handleOperator(request, env);
		if (operatør) return operatør;

		return new Response("Not found", { status: 404 });
	},

	async scheduled(controller, env) {
		const now = new Date(controller.scheduledTime);
		const source = new NewswebSource();

		if (controller.cron === POLL_CRON) {
			// Bevisst ikke i waitUntil: en kjøring som feiler skal rapporteres som
			// feilet av Cloudflare også, ikke bare i run-tabellen.
			await ingest(
				env,
				source,
				"poll",
				{ from: new Date(now.getTime() - POLL_VINDU_MS), to: now },
				now,
			);

			const helse = await checkHealth(env.DB, now);
			if (helse.alarm) {
				// Strukturert, slik at et varsel kan hektes på uten å parse fritekst.
				console.error({ hendelse: "alarm", grunner: helse.reasons });
			}
			return;
		}

		if (controller.cron === BACKFILL_CRON) {
			await backfill(env, source, now);
			return;
		}

		if (controller.cron === SELSKAP_CRON) {
			await syncCompanies(env, source, now);
		}
	},

	async queue(batch, env) {
		await handleQueue(batch, env, new Date());
	},
} satisfies ExportedHandler<Env, EnrichmentJob>;
