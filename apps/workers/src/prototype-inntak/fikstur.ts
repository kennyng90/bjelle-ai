/**
 * PROTOTYPE - kastes når spørsmålet er besvart. Se NOTES.md.
 *
 * Fikstur som står i for Newsweb og språkmodellen. Alt er data, ingen nettverk.
 * Meldingene er valgt for å treffe hvert tilfelle i "Tilfeller som må dekkes".
 */

import type { Kilde, KildeMelding, LlmSvar } from "./pipeline.ts";

// Hardt mellomrom i brødteksten, vanlig mellomrom i sitatet. Normaliseringen
// skal gjøre disse like, ellers forkastes tall som faktisk står i meldingen.
const NBSP = " ";

const EMISJON: KildeMelding = {
	id: "NW-2401",
	selskap: "Nel ASA",
	ticker: "NEL",
	marked: "hovedliste",
	tittel: "Vellykket gjennomføring av rettet emisjon",
	kildekategori: "EMISJON",
	sprak: "no",
	publisert: "2026-08-09T07:02:00Z",
	vedlegg: [],
	brodtekst: `Nel ASA har gjennomført en rettet emisjon mot utvalgte investorer med fravikelse av eksisterende aksjonærers fortrinnsrett. Emisjonen tilfører selskapet et bruttoproveny på NOK 450${NBSP}000${NBSP}000, fordelt på 45${NBSP}000${NBSP}000 nye aksjer til en tegningskurs på NOK 10,00 per aksje.`,
};

const TEKNISK: KildeMelding = {
	id: "NW-2402",
	selskap: "Equinor ASA",
	ticker: "EQNR",
	marked: "hovedliste",
	tittel: "Endring i antall aksjer og stemmer",
	kildekategori: "TEKNISK_MELDING",
	sprak: "no",
	publisert: "2026-08-09T07:11:00Z",
	vedlegg: [],
	brodtekst:
		"I henhold til verdipapirhandelloven § 4-1 opplyses det at samlet antall utstedte aksjer i Equinor ASA per 31. juli 2026 er 2 700 000 000, hver pålydende NOK 2,50.",
};

const KVARTAL: KildeMelding = {
	id: "NW-2403",
	selskap: "Aker BP ASA",
	ticker: "AKRBP",
	marked: "hovedliste",
	tittel: "Second quarter 2026 results",
	kildekategori: "KVARTALSRAPPORT",
	sprak: "en",
	publisert: "2026-08-09T05:30:00Z",
	vedlegg: ["Q2-2026-report.pdf", "Q2-2026-presentation.pdf"],
	brodtekst:
		"Aker BP ASA reports total income of USD 3 210 million for the second quarter of 2026, up from USD 2 980 million in the same quarter last year. The board proposes a quarterly dividend of USD 0.63 per share.",
};

const KALENDER: KildeMelding = {
	id: "NW-2404",
	selskap: "Kahoot! ASA",
	ticker: "KAHOT",
	marked: "expand",
	tittel: "Endring i finansiell kalender",
	kildekategori: "ENDRING_I_FINANSIELL_KALENDER", // finnes ikke i kategoritabellen
	sprak: "no",
	publisert: "2026-08-09T08:00:00Z",
	vedlegg: [],
	brodtekst:
		"Kahoot! ASA flytter publiseringen av rapporten for tredje kvartal 2026 fra 22. oktober 2026 til 29. oktober 2026.",
};

const ORDRE: KildeMelding = {
	id: "NW-2405",
	selskap: "Hydrogenpro AS",
	ticker: "HYPRO",
	marked: "growth",
	tittel: "Tildelt kontrakt i Tyskland",
	kildekategori: "ORDRE",
	sprak: "no",
	publisert: "2026-08-09T08:14:00Z",
	vedlegg: [],
	brodtekst:
		"Hydrogenpro AS har signert en kontrakt med en tysk industriaktør om leveranse av elektrolysører. Kontraktsverdien er NOK 210 millioner, og leveransen skjer i 2027.",
};

const KORREKSJON: KildeMelding = {
	id: "NW-2406",
	selskap: "Nel ASA",
	ticker: "NEL",
	marked: "hovedliste",
	tittel: "Korreksjon: Vellykket gjennomføring av rettet emisjon",
	kildekategori: "EMISJON",
	sprak: "no",
	publisert: "2026-08-09T09:40:00Z",
	vedlegg: [],
	korrigerer: "NW-2401",
	brodtekst: `Det korrigeres herved at tegningskursen i den rettede emisjonen er NOK 10,50 per aksje, ikke NOK 10,00 som oppgitt i melding av 9. august 2026. Bruttoprovenyet er uendret NOK 450${NBSP}000${NBSP}000.`,
};

const batcher: KildeMelding[][] = [
	[EMISJON, TEKNISK, KVARTAL],
	// Overlappsvinduet gjør at NW-2401 kommer igjen. Den skal avvises.
	[EMISJON, KALENDER, ORDRE],
	[KORREKSJON],
];

const svar: Record<string, LlmSvar> = {
	// Modellen synes emisjonen er formalia. Gulvet skal overkjøre den.
	"NW-2401": {
		kategori: "EMISJON",
		viktighet: "stoy",
		hva_skjedde:
			"Nel har hentet inn nye penger ved å selge aksjer til utvalgte investorer. Du som eier fra før fikk ikke tilbud om å være med, så eierandelen din blir mindre.",
		tall: [
			{
				merkelapp: "emisjonsbeløp",
				verdi: "450 000 000",
				enhet: "NOK",
				sitat: "bruttoproveny på NOK 450 000 000",
			},
			{
				merkelapp: "tegningskurs",
				verdi: "10,00",
				enhet: "NOK",
				sitat: "tegningskurs på NOK 10,00 per aksje",
			},
		],
		begreper: ["rettet_emisjon", "fortrinnsrett", "tegningskurs"],
		ukjente_begreper: ["bruttoproveny"],
		tokens: 4200,
	},

	// Motsatt vei: modellen roper opp om en ren formalitet.
	"NW-2402": {
		kategori: "TEKNISK_MELDING",
		viktighet: "viktig",
		hva_skjedde:
			"Equinor melder hvor mange aksjer selskapet har utstedt. Dette er en pliktmelding uten nyhetsverdi.",
		tall: [
			{
				merkelapp: "antall aksjer",
				verdi: "2 700 000 000",
				enhet: "stk",
				sitat: "er 2 700 000 000",
			},
		],
		begreper: ["palydende"],
		ukjente_begreper: [],
		tokens: 2600,
	},

	// Engelsk melding, norsk sammendrag, ett oppdiktet sitat som skal forkastes.
	"NW-2403": {
		kategori: "KVARTALSRAPPORT",
		viktighet: "greit_a_vite",
		hva_skjedde:
			"Aker BP la fram tallene for andre kvartal. Inntektene var høyere enn i samme kvartal i fjor, og styret foreslår utbytte.",
		tall: [
			{
				merkelapp: "inntekter",
				verdi: "3 210",
				enhet: "mill. USD",
				sitat: "total income of USD 3 210 million",
			},
			{
				merkelapp: "utbytte per aksje",
				verdi: "0,63",
				enhet: "USD",
				sitat: "quarterly dividend of USD 0.63 per share",
			},
			// Står ingen steder i meldingen. Hele oppføringen skal bort.
			{
				merkelapp: "resultat før skatt",
				verdi: "1 900",
				enhet: "mill. USD",
				sitat: "profit before tax of USD 1 900 million",
			},
		],
		begreper: ["utbytte", "kvartalsrapport"],
		ukjente_begreper: ["total income"],
		tokens: 5100,
	},

	// Ukjent kildekategori. Modellen vil ha den ned i støy, gulvet holder igjen.
	"NW-2404": {
		kategori: "ANNET",
		viktighet: "stoy",
		hva_skjedde:
			"Kahoot! utsetter kvartalsrapporten med én uke. Ingenting er endret i selskapets drift.",
		tall: [],
		begreper: ["finansiell_kalender"],
		ukjente_begreper: [],
		tokens: 1800,
	},

	// Growth-selskap, fri kategori, modellen får bestemme.
	"NW-2405": {
		kategori: "ORDRE",
		viktighet: "viktig",
		hva_skjedde:
			"Hydrogenpro har fått en kontrakt i Tyskland. Kontrakten er stor sammenlignet med selskapets størrelse.",
		tall: [
			{ merkelapp: "kontraktsverdi", verdi: "210", enhet: "mill. NOK", sitat: "NOK 210 millioner" },
		],
		begreper: ["ordrereserve"],
		ukjente_begreper: ["elektrolysor"],
		tokens: 3300,
	},

	"NW-2406": {
		kategori: "EMISJON",
		viktighet: "greit_a_vite",
		hva_skjedde:
			"Nel retter opp prisen i emisjonen: aksjene ble solgt for 10,50 kroner, ikke 10,00 som først meldt. Beløpet selskapet henter er det samme.",
		tall: [
			{
				merkelapp: "tegningskurs",
				verdi: "10,50",
				enhet: "NOK",
				sitat: "tegningskursen i den rettede emisjonen er NOK 10,50 per aksje",
			},
		],
		begreper: ["tegningskurs"],
		ukjente_begreper: [],
		tokens: 2400,
	},
};

const BACKFILL_SELSKAP = [
	{ selskap: "DNB Bank ASA", ticker: "DNB", marked: "hovedliste" as const },
	{ selskap: "Norsk Hydro ASA", ticker: "NHY", marked: "hovedliste" as const },
];

function backfill(maned: number): KildeMelding[] {
	return BACKFILL_SELSKAP.map((s, i) => ({
		id: `NW-BF-${maned}-${i + 1}`,
		selskap: s.selskap,
		ticker: s.ticker,
		marked: s.marked,
		tittel: `Historisk melding fra ${s.ticker}, måned -${maned}`,
		kildekategori: i === 0 ? "KVARTALSRAPPORT" : "EGNE_AKSJER",
		sprak: "no" as const,
		publisert: `2026-${String(8 - (maned % 8)).padStart(2, "0")}-01T06:00:00Z`,
		vedlegg: [],
		brodtekst: `${s.selskap} melder om aktivitet i måned -${maned}. Beløpet er NOK 12 millioner.`,
	}));
}

// Fikstursvar for alt backfillen kan finne, slik at køen kan tømmes.
for (let maned = 1; maned <= 12; maned++) {
	for (const melding of backfill(maned)) {
		svar[melding.id] = {
			kategori: melding.kildekategori,
			viktighet: "greit_a_vite",
			hva_skjedde: `${melding.selskap} meldte noe i måned -${maned}.`,
			tall: [{ merkelapp: "beløp", verdi: "12", enhet: "mill. NOK", sitat: "NOK 12 millioner" }],
			begreper: [],
			ukjente_begreper: [],
			tokens: 2000,
		};
	}
}

export const kilde: Kilde = { batcher, backfill, llmSvar: svar };
