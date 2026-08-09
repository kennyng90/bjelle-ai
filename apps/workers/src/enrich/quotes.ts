import type { Figure } from "./schema.ts";

/**
 * Sitatverifisering. Eksakt strengsammenligning etter normalisering, ingen
 * uskarp sammenligning og ingen terskel.
 *
 * Slår den ut, forkastes hele talloppføringen - ikke bare sitatet. Et tall uten
 * belegg er verre enn ikke noe tall: brukeren heller mangler et tall enn å se et
 * feil ett, og én feil er nok til å bryte tilliten.
 */

/**
 * Bindestrek- og tankestrekvarianter, samt matematisk minustegn. Skrevet som
 * escapes med vilje: tegnene er usynlige i en editor, og en regel hele
 * produktets troverdighet hviler på skal ikke være umulig å lese.
 *
 * Harde og smale mellomrom trenger ingen egen regel - de er blanktegn, og
 * kollapses av \s-uttrykket under. Streker er det ikke.
 */
const BINDESTREKVARIANTER = /[\u2010-\u2015\u2212]/g;

/**
 * Normaliseringen er avgrenset til tegn som er typografiske varianter av samme
 * tegn, og gjelder begge sider av sammenligningen.
 *
 * Dette er ikke uskarp sammenligning, men en forutsetning for at målingen skal
 * bety noe. Newsweb skriver `NOK 450 000 000` med hardt mellomrom. Uten dette
 * forkastes et tall som faktisk står ordrett i meldingen, og forkastningsraten
 * måler parseren vår i stedet for prompten.
 */
export function normalizeForQuoteMatch(text: string): string {
	return text.replace(/\s+/g, " ").replace(BINDESTREKVARIANTER, "-").trim();
}

export interface VerifiedFigures {
	kept: Figure[];
	discarded: number;
}

/**
 * Beholder kun tall der sitatet finnes ordrett i brødteksten. Telleren er det
 * objektive kvalitetsmålet på prompten, og regnes per prompt-hash slik at en
 * promptendring kan måles mot ekte data.
 */
export function verifyFigures(figures: Figure[], body: string): VerifiedFigures {
	const normalisertTekst = normalizeForQuoteMatch(body);
	const kept: Figure[] = [];
	let discarded = 0;

	for (const figure of figures) {
		const sitat = normalizeForQuoteMatch(figure?.quote ?? "");
		if (sitat.length > 0 && normalisertTekst.includes(sitat)) {
			kept.push(figure);
		} else {
			discarded++;
		}
	}

	return { kept, discarded };
}
