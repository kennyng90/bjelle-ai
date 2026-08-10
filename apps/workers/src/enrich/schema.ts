import type { Importance } from "../domain.ts";
import { GLOSSARY_TERMS } from "./glossary.ts";

/**
 * Skjemaet er produktets viktigste grense. Det er det som gjør investeringsråd
 * strukturelt umulig: det finnes ingen felter å skrive råd i.
 *
 * Ingen felter for vurdering, konsekvens, framtidsutsikt eller kurspåvirkning.
 * Legger du til ett, har du fjernet garantien produktet hviler på.
 *
 * Feltnavnene er engelske, innholdet er norsk. Kravet om klarspråk hører hjemme
 * i feltbeskrivelsene og i prompten, ikke i nøkkelnavnene.
 */

/**
 * Produktkategorien modellen velger. Ikke det samme som kildens regulatoriske
 * kategori: den setter viktighetsgulvet og bor i klassifiseringslaget.
 */
export const PRODUCT_CATEGORIES = [
	"share_issue",
	"share_buyback",
	"acquisition",
	"divestment",
	"merger",
	"earnings_report",
	"earnings_warning",
	"dividend",
	"contract_award",
	"management_change",
	"board_change",
	"major_shareholding",
	"insider_trade",
	"refinancing",
	"bankruptcy_warning",
	"trading_halt",
	"listing_change",
	"general_meeting",
	"prospectus",
	"licence_or_permit",
	"technical",
	"other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface Figure {
	/** Norsk visningstekst, f.eks. "emisjonsbeløp". Innhold, ikke identifikator. */
	label: string;
	value: string;
	unit: string;
	/** Ordrett fra brødteksten. Verifiseres før lagring. */
	quote: string;
}

/** Svaret slik modellen leverte det, før sitatverifisering og klemming. */
export interface ModelOutput {
	category: ProductCategory;
	importance: Importance;
	what_happened: string;
	figures: Figure[];
	terms: string[];
	unknown_terms: string[];
}

export const OUTPUT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	required: ["category", "importance", "what_happened", "figures", "terms", "unknown_terms"],
	properties: {
		category: {
			type: "string",
			enum: PRODUCT_CATEGORIES,
			description: "Hva meldingen handler om.",
		},
		importance: {
			type: "string",
			enum: ["important", "good_to_know", "noise"],
			description:
				"Hvor mye dette betyr for en privatperson som eier aksjen. important: endrer eierandel, verdi eller risiko. good_to_know: verdt å vite, men krever ingenting. noise: ren formalitet.",
		},
		what_happened: {
			type: "string",
			description:
				"Nøyaktig to setninger på norsk som beskriver hva som har skjedd. Klarspråk, ingen fagord uten at de også står i terms. Beskriv kun hva meldingen sier, aldri hva leseren bør gjøre, og aldri hva du tror om framtiden.",
		},
		figures: {
			type: "array",
			description:
				"Tallene som betyr noe i meldingen. Ta bare med tall du kan sitere ordrett fra brødteksten. Er du i tvil, la tallet være.",
			items: {
				type: "object",
				additionalProperties: false,
				required: ["label", "value", "unit", "quote"],
				properties: {
					label: { type: "string", description: 'Norsk merkelapp, f.eks. "emisjonsbeløp".' },
					value: { type: "string", description: "Selve tallet, slik det står i meldingen." },
					unit: { type: "string", description: 'Enhet, f.eks. "NOK", "prosent", "aksjer".' },
					quote: {
						type: "string",
						description:
							"Ordrett utdrag fra brødteksten der tallet står. Må kunne finnes igjen tegn for tegn.",
					},
				},
			},
		},
		terms: {
			type: "array",
			description:
				"Fagord fra ordlista som er relevante for denne meldingen. Kun nøkler fra lista, aldri egne forklaringer.",
			items: { type: "string", enum: GLOSSARY_TERMS },
		},
		unknown_terms: {
			type: "array",
			description:
				"Fagord meldingen bruker som en nybegynner ville trengt forklart, men som ikke finnes i ordlista.",
			items: { type: "string" },
		},
	},
} as const;
