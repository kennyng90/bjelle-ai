import type { Language } from "./domain.ts";

// Funksjonsord er nok her. Vi skiller kun norsk fra engelsk, og børsmeldinger er
// lange nok til at et titalls treff avgjør. En modell eller et bibliotek ville
// kostet mer enn feilen den fjerner.
const NORSKE_ORD =
	/\b(og|er|ikke|som|har|for|med|til|av|det|en|et|ble|selskapet|aksjer|kroner|styret|melding)\b/gi;
const ENGELSKE_ORD =
	/\b(the|and|is|of|to|in|that|has|will|shares|company|board|announcement|per)\b/gi;

/**
 * Gjetter språket i brødteksten. Brukes til å fortelle modellen at den skal
 * oversette, ikke til å avgjøre om en melding lagres.
 */
export function detectLanguage(text: string): Language {
	const norsk = (text.match(NORSKE_ORD)?.length ?? 0) + (text.match(/[æøåÆØÅ]/g)?.length ?? 0);
	const engelsk = text.match(ENGELSKE_ORD)?.length ?? 0;
	return norsk > engelsk ? "no" : "en";
}
