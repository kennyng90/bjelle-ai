import Anthropic from "@anthropic-ai/sdk";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt.ts";
import type { ModelOutput } from "./schema.ts";
import { OUTPUT_SCHEMA } from "./schema.ts";

/**
 * Språkmodellkallet. Ett kall per melding som fyller hele skjemaet, slik
 * docs/BESLUTNINGER.md bestemmer.
 */

/** Claude Sonnet, valgt i docs/BESLUTNINGER.md. */
export const MODEL = "claude-sonnet-5";

/**
 * Taket dekker tenketokens *og* svaret. En lang børsmelding kan bruke opp et
 * knapt tak før JSON-en er ferdig, og en avkortet melding feiler likt hver
 * gang - tre forsøk senere ligger den i dødbrevkø uten at noe var galt med den.
 */
const MAKS_TOKENS = 16000;

/**
 * Listepris per million tokens. Introduksjonsprisen ($2/$10) gjelder ut
 * august 2026, så tallet her er konservativt til den utløper - kostnaden vi
 * viser skal aldri være lavere enn den faktiske.
 */
const INPUT_USD_PER_MTOK = 3;
const OUTPUT_USD_PER_MTOK = 15;

export interface ModelCall {
	output: ModelOutput;
	inputTokens: number;
	outputTokens: number;
	costUsd: number;
}

export interface MessageForModel {
	title: string;
	body: string;
	sourceCategory: string;
	companyName: string;
}

/** Modellen svarte, men ikke med noe vi kan bruke. */
export class ModelOutputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ModelOutputError";
	}
}

export async function callModel(apiKey: string, melding: MessageForModel): Promise<ModelCall> {
	const client = new Anthropic({ apiKey });

	const svar = await client.messages.create({
		model: MODEL,
		max_tokens: MAKS_TOKENS,
		system: SYSTEM_PROMPT,
		messages: [{ role: "user", content: buildUserPrompt(melding) }],
		// Skjemastyrt utdata er det som gjør investeringsråd strukturelt umulig.
		// Lav effort holder: dette er avgrenset uttrekk fra en kort tekst, ikke
		// et resonneringsproblem. Stiger forkastningsraten, er dette første knapp.
		thinking: { type: "adaptive" },
		output_config: {
			effort: "low",
			format: { type: "json_schema", schema: OUTPUT_SCHEMA },
		},
	});

	if (svar.stop_reason === "refusal") {
		throw new ModelOutputError("modellen avslo forespørselen");
	}
	if (svar.stop_reason === "max_tokens") {
		throw new ModelOutputError("svaret ble avkortet av max_tokens");
	}

	const tekst = svar.content.find((blokk) => blokk.type === "text")?.text;
	if (!tekst) {
		throw new ModelOutputError("svaret inneholdt ingen tekst");
	}

	let output: ModelOutput;
	try {
		output = JSON.parse(tekst) as ModelOutput;
	} catch (feil) {
		throw new ModelOutputError(`svaret var ikke gyldig JSON: ${feil}`);
	}

	const inputTokens = svar.usage.input_tokens ?? 0;
	const outputTokens = svar.usage.output_tokens ?? 0;

	return {
		output,
		inputTokens,
		outputTokens,
		costUsd:
			(inputTokens / 1_000_000) * INPUT_USD_PER_MTOK +
			(outputTokens / 1_000_000) * OUTPUT_USD_PER_MTOK,
	};
}
