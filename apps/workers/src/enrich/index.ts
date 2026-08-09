import { clampImportance } from "../classify.ts";
import type { Importance, SourceCategory } from "../domain.ts";
import { GLOSSARY } from "./glossary.ts";
import { callModel, MODEL, ModelOutputError } from "./model.ts";
import { promptHash } from "./prompt.ts";
import { verifyFigures } from "./quotes.ts";
import type { Figure, ProductCategory } from "./schema.ts";
import { PRODUCT_CATEGORIES } from "./schema.ts";

/**
 * Berikelseslaget. Det eier språkmodellkallet, skjemavalideringen,
 * sitatverifiseringen og ordlisteoppslaget - og skriver ikke selv til
 * databasen. Da kan berikelsen kjøres om uten å røre lagringen, og lagringen
 * kan endres uten å røre berikelsen.
 */

export interface StoredMessage {
	sourceId: string;
	title: string;
	body: string;
	sourceCategory: SourceCategory;
	companyName: string;
}

export interface Enrichment {
	category: ProductCategory;
	/** Etter klemming mot kategoriens intervall. */
	importance: Importance;
	/** Hva modellen sa, kun når klemmingen faktisk endret svaret. */
	clampedFrom: Importance | null;
	whatHappened: string;
	/** Kun tall som overlevde sitatverifiseringen. */
	figures: Figure[];
	discardedFigures: number;
	terms: string[];
	unknownTerms: string[];
	model: string;
	promptHash: string;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
}

export async function enrich(apiKey: string, melding: StoredMessage): Promise<Enrichment> {
	const kall = await callModel(apiKey, melding);
	const { output } = kall;

	// Skjemaet håndhever dette allerede, men et svar vi ikke kan stole på skal
	// feile her og havne i enrichment_failed, ikke bli publisert halvveis.
	if (typeof output?.what_happened !== "string" || output.what_happened.trim() === "") {
		throw new ModelOutputError("what_happened mangler");
	}
	if (!PRODUCT_CATEGORIES.includes(output.category)) {
		throw new ModelOutputError(`ukjent kategori: ${output.category}`);
	}
	if (!["important", "good_to_know", "noise"].includes(output.importance)) {
		throw new ModelOutputError(`ukjent viktighet: ${output.importance}`);
	}

	// Viktighetsgulvet slår modellen. En emisjon kan aldri bli støy, uansett hvor
	// kjedelig den er formulert, og en ukjent kildekategori faller aldri til støy.
	const { importance, clampedFrom } = clampImportance(melding.sourceCategory, output.importance);

	const { kept, discarded } = verifyFigures(output.figures ?? [], melding.body);

	// Modellen får kun velge blant nøklene i skjemaet, men vi stoler ikke på det
	// alene: et begrep uten forklaring i lista er et ukjent begrep.
	const terms: string[] = [];
	const unknownTerms = new Set((output.unknown_terms ?? []).map((t) => t.trim().toLowerCase()));
	for (const term of output.terms ?? []) {
		if (term in GLOSSARY) terms.push(term);
		else unknownTerms.add(term.trim().toLowerCase());
	}

	return {
		category: output.category,
		importance,
		clampedFrom,
		whatHappened: output.what_happened.trim(),
		figures: kept,
		discardedFigures: discarded,
		terms: [...new Set(terms)],
		unknownTerms: [...unknownTerms].filter((t) => t.length > 0),
		model: MODEL,
		promptHash: await promptHash(),
		inputTokens: kall.inputTokens,
		outputTokens: kall.outputTokens,
		costUsd: kall.costUsd,
	};
}

export { ModelOutputError } from "./model.ts";
