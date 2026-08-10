import type { SourceCategory } from "./domain.ts";
import { enrich } from "./enrich/index.ts";
import type { EnrichmentJob } from "./ingest.ts";
import { countAttempt, loadMessageForEnrichment, saveEnrichment, setState } from "./store.ts";

/**
 * Køkonsumenten. Beriker én melding om gangen, med begrensede forsøk og en
 * dødbrevkø.
 *
 * En melding som feiler her er fortsatt fullt lesbar med tittel, selskap,
 * kategori, viktighet og lenke. Det er hele grunnen til at berikelsen ligger i
 * kø og ikke i cronen: språkmodellen kan være nede uten at noe går tapt.
 */

/**
 * Tre forsøk, så dødbrevkø. Vi teller i D1 i stedet for å la køen telle alene,
 * fordi "tre forsøk brukt opp" ellers er umulig å skille fra "venter på nytt
 * forsøk" - og da kan ikke brukerhistorie 26 observeres.
 */
const MAKS_FORSØK = 3;

export const ENRICHMENT_QUEUE = "bjelle-enrichment";
export const DEAD_LETTER_QUEUE = "bjelle-enrichment-dlq";

export async function handleQueue(
	batch: MessageBatch<EnrichmentJob>,
	env: Env,
	now: Date,
): Promise<void> {
	if (batch.queue === DEAD_LETTER_QUEUE) {
		await håndterDødbrev(batch, env);
		return;
	}

	for (const melding of batch.messages) {
		await berikÉn(melding, env, now);
	}
}

async function berikÉn(kømelding: Message<EnrichmentJob>, env: Env, now: Date): Promise<void> {
	const meldingId = kømelding.body?.messageId;
	if (!meldingId) {
		console.error({ hendelse: "kojobb_uten_id" });
		kømelding.ack();
		return;
	}

	const rad = await loadMessageForEnrichment(env.DB, meldingId);
	if (!rad) {
		// Meldingen finnes ikke. Å prøve igjen hjelper ikke.
		console.error({ hendelse: "berikelse_mangler_melding", meldingId });
		kømelding.ack();
		return;
	}
	if (rad.state === "enriched") {
		kømelding.ack();
		return;
	}

	const forsøk = await countAttempt(env.DB, meldingId);

	try {
		const berikelse = await enrich(env.ANTHROPIC_API_KEY, {
			sourceId: rad.source_id,
			title: rad.title,
			body: rad.body,
			sourceCategory: rad.source_category as SourceCategory,
			companyName: rad.company_name ?? "",
		});

		await saveEnrichment(
			env.DB,
			{
				messageId: meldingId,
				category: berikelse.category,
				importance: berikelse.importance,
				clampedFrom: berikelse.clampedFrom,
				whatHappened: berikelse.whatHappened,
				figures: berikelse.figures,
				terms: berikelse.terms,
				unknownTerms: berikelse.unknownTerms,
				model: berikelse.model,
				promptHash: berikelse.promptHash,
				inputTokens: berikelse.inputTokens,
				outputTokens: berikelse.outputTokens,
				costUsd: berikelse.costUsd,
				discardedFigures: berikelse.discardedFigures,
			},
			now,
		);

		console.log({
			hendelse: "beriket",
			meldingId,
			forkastedeTall: berikelse.discardedFigures,
			klemtFra: berikelse.clampedFrom,
			kostnadUsd: berikelse.costUsd,
		});
		kømelding.ack();
	} catch (feil) {
		console.error({ hendelse: "berikelse_feilet", meldingId, forsøk, feil: String(feil) });

		if (forsøk >= MAKS_FORSØK) {
			// Tre forsøk brukt opp. Meldingen blir liggende lesbar, men vi slutter
			// å bruke penger og kapasitet på den til noen har sett på den.
			await setState(env.DB, [meldingId], "dead_letter");
			kømelding.ack();
			return;
		}

		await setState(env.DB, [meldingId], "enrichment_failed");
		kømelding.retry();
	}
}

/**
 * Dødbrevkøen fanger det vår egen teller ikke ser: krasj, timeout og meldinger
 * køen ga opp på selv. Den skriver tilstanden og gjør ikke annet - en giftig
 * melding skal stoppe her, ikke stoppe all berikelse.
 */
async function håndterDødbrev(batch: MessageBatch<EnrichmentJob>, env: Env): Promise<void> {
	const ider = batch.messages.map((m) => m.body?.messageId).filter((id): id is string => !!id);
	if (ider.length > 0) {
		await setState(env.DB, ider, "dead_letter");
		console.error({ hendelse: "dodbrev", meldinger: ider });
	}
	batch.ackAll();
}
