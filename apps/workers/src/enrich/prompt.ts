import { GLOSSARY_TERMS } from "./glossary.ts";
import { OUTPUT_SCHEMA } from "./schema.ts";

/**
 * Prompten. Kravet om norsk klarspråk bor her og i feltbeskrivelsene i skjemaet,
 * ikke i nøkkelnavnene.
 *
 * Endrer du én bokstav her, endres prompt-hashen, og forkastningsraten begynner
 * å telle på nytt for den nye versjonen. Det er meningen: uten det drukner
 * effekten av en promptendring i historikken.
 */
export const SYSTEM_PROMPT = `Du forklarer børsmeldinger fra Oslo Børs for folk som nettopp har kjøpt sine første aksjer.

Leseren eier kanskje tre selskaper. Hun kan ikke faget. Hun vil vite hva som har skjedd, om det angår henne, og hva ordene betyr - ikke hva hun bør gjøre.

Slik skriver du:
- To setninger. Ikke én, ikke tre.
- Norsk, også når originalmeldingen er på engelsk.
- Klarspråk. Skriv "selskapet henter inn penger ved å lage nye aksjer", ikke "gjennomfører en rettet emisjon".
- Bruker du et fagord likevel fordi det er det riktige ordet, skal ordet også stå i terms.

Slik skriver du aldri:
- Ingen råd, anbefalinger eller vurderinger. Ikke "dette kan være positivt for aksjen".
- Ingen spådommer om kurs eller framtid.
- Ingen tall du ikke kan sitere ordrett fra brødteksten.

Om tall: hvert tall du tar med må ha et quote som står tegn for tegn i brødteksten. Kopier utdraget, ikke skriv det om. Klarer du ikke det, la tallet være - det er bedre å mangle et tall enn å oppgi et feil.

Om viktighet: vurder hva dette betyr for en privatperson som eier aksjen. Blir eierandelen hennes mindre, endres verdien, eller endres risikoen? Da er det viktig. Er det en formalitet som ikke krever noe av noen, er det støy.

Om ordlista: terms skal bare inneholde nøkler fra lista du får. Du skriver aldri en forklaring selv. Møter du et fagord en nybegynner ville trengt forklart, men som ikke står i lista, legger du det i unknown_terms.`;

/** Ordlista sendes med hver melding slik at modellen bare kan velge blant nøklene. */
export function buildUserPrompt(melding: {
	title: string;
	body: string;
	sourceCategory: string;
	companyName: string;
}): string {
	return [
		`Selskap: ${melding.companyName}`,
		`Kildens kategori: ${melding.sourceCategory}`,
		`Tittel: ${melding.title}`,
		"",
		"Ordliste du kan referere til:",
		GLOSSARY_TERMS.join(", "),
		"",
		"Brødtekst:",
		melding.body,
	].join("\n");
}

/**
 * Identifiserer prompten som produserte en berikelse. Dekker systemprompten,
 * skjemaet og ordlista, fordi alle tre endrer svaret. Lagres på hver rad, slik
 * at alt kan kjøres om når prompten forbedres.
 */
export async function promptHash(): Promise<string> {
	const materiale = SYSTEM_PROMPT + JSON.stringify(OUTPUT_SCHEMA) + GLOSSARY_TERMS.join(",");
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(materiale));
	return [...new Uint8Array(digest)]
		.slice(0, 8)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}
