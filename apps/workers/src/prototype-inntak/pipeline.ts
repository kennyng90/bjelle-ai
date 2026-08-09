/**
 * PROTOTYPE - kastes når spørsmålet er besvart. Se NOTES.md.
 *
 * Ren logikk for inntakspipelinen i issue #2: tilstandsmaskinen for en melding,
 * viktighetsgulvet fra kategoritabellen, og sitatverifiseringen.
 * Ingen I/O, ingen console, ingen Cloudflare. TUI-en er et skall utenpå dette.
 */

export type Marked = "hovedliste" | "expand" | "growth";
export type Viktighet = "stoy" | "greit_a_vite" | "viktig";
export type MeldingTilstand = "lagret" | "i_ko" | "beriket" | "berikelse_feilet" | "dodbrev";

const RANG: Record<Viktighet, number> = { stoy: 0, greit_a_vite: 1, viktig: 2 };

// ---------------------------------------------------------------- kategoritabell

type Gulv = { standard: Viktighet; min: Viktighet; maks: Viktighet };

const ALLTID_VIKTIG: Gulv = { standard: "viktig", min: "viktig", maks: "viktig" };
const ALLTID_STOY: Gulv = { standard: "stoy", min: "stoy", maks: "stoy" };
const MODELLEN_BESTEMMER: Gulv = { standard: "greit_a_vite", min: "stoy", maks: "viktig" };
// Ukjent kategori faller til greit å vite og kan heves, aldri senkes til støy.
const UKJENT: Gulv = { standard: "greit_a_vite", min: "greit_a_vite", maks: "viktig" };

export const KATEGORITABELL: Record<string, Gulv> = {
	EMISJON: ALLTID_VIKTIG,
	OPPKJOP_BUD: ALLTID_VIKTIG,
	RESULTATVARSEL: ALLTID_VIKTIG,
	SUSPENSJON: ALLTID_VIKTIG,
	KONKURSVARSEL: ALLTID_VIKTIG,
	LEDELSESENDRING: ALLTID_VIKTIG,
	TEKNISK_MELDING: ALLTID_STOY,
	FLAGGING_UNDER_TERSKEL: ALLTID_STOY,
	EGNE_AKSJER: ALLTID_STOY,
	KVARTALSRAPPORT: MODELLEN_BESTEMMER,
	ORDRE: MODELLEN_BESTEMMER,
	ANNET: MODELLEN_BESTEMMER,
};

export function gulvFor(kildekategori: string): Gulv {
	return KATEGORITABELL[kildekategori] ?? UKJENT;
}

/** Viktighet ved `lagret`, uten å vente på modellen. */
export function viktighetVedLagring(kildekategori: string): Viktighet {
	return gulvFor(kildekategori).standard;
}

/** Modellens skjønn klemt inn i det kategoritabellen tillater. */
export function klemViktighet(
	kildekategori: string,
	modellens: Viktighet,
): { viktighet: Viktighet; overstyrt: boolean } {
	const gulv = gulvFor(kildekategori);
	let ut = modellens;
	if (RANG[ut] < RANG[gulv.min]) ut = gulv.min;
	if (RANG[ut] > RANG[gulv.maks]) ut = gulv.maks;
	return { viktighet: ut, overstyrt: ut !== modellens };
}

// ------------------------------------------------------------ sitatverifisering

/** Normaliserer hardt mellomrom og linjeskift, ellers ordrett. Ingen uskarp match. */
export function normaliser(tekst: string): string {
	return tekst.replace(/[   ]/g, " ").replace(/[‐-―]/g, "-").replace(/\s+/g, " ").trim();
}

export function sitatFinnes(brodtekst: string, sitat: string): boolean {
	return normaliser(brodtekst).includes(normaliser(sitat));
}

// ------------------------------------------------------------------ kildelaget

export type KildeMelding = {
	id: string;
	selskap: string;
	ticker: string;
	marked: Marked;
	tittel: string;
	kildekategori: string;
	brodtekst: string;
	sprak: "no" | "en";
	publisert: string;
	vedlegg: string[];
	korrigerer?: string;
};

export type LlmTall = { merkelapp: string; verdi: string; enhet: string; sitat: string };

export type LlmSvar = {
	kategori: string;
	viktighet: Viktighet;
	hva_skjedde: string;
	tall: LlmTall[];
	begreper: string[];
	ukjente_begreper: string[];
	tokens: number;
};

/** Alt prototypen vet om omverdenen, som ren data. */
export type Kilde = {
	batcher: KildeMelding[][];
	backfill: (maned: number) => KildeMelding[];
	llmSvar: Record<string, LlmSvar>;
};

// --------------------------------------------------------------------- tilstand

export type Tall = LlmTall & { godkjent: boolean };

export type Berikelse = {
	meldingId: string;
	modell: string;
	promptHash: string;
	hva_skjedde: string;
	tall: Tall[];
	begreper: string[];
	forkastede: number;
	tokens: number;
	tidspunkt: number;
};

export type Melding = {
	id: string;
	selskap: string;
	ticker: string;
	marked: Marked;
	tittel: string;
	kildekategori: string;
	kjentKategori: boolean;
	brodtekst: string;
	sprak: "no" | "en";
	publisert: string;
	tilstand: MeldingTilstand;
	viktighet: Viktighet;
	modellensViktighet?: Viktighet;
	gulvOverstyrte: boolean;
	korrigerer?: string;
	korrigertAv?: string;
	vedlegg: string[];
	raNokkel: string;
	forsok: number;
};

export type Kjoring = {
	nr: number;
	slag: "poll" | "backfill";
	funnet: number;
	nye: number;
	feil?: string;
};

export type Pipeline = {
	meldinger: Melding[];
	ko: string[];
	dodbrev: string[];
	berikelser: Berikelse[];
	ukjenteBegreper: Record<string, number>;
	kjoringer: Kjoring[];
	r2: string[];
	promptVersjon: number;
	nesteBatch: number;
	backfillManed: number;
	hendelser: string[];
};

export const MAKS_FORSOK = 3;
const BACKFILL_MANEDER = 12;
const BERIK_VED_BACKFILL = 3; // kun de siste tre månedene i køen

export function tomPipeline(): Pipeline {
	return {
		meldinger: [],
		ko: [],
		dodbrev: [],
		berikelser: [],
		ukjenteBegreper: {},
		kjoringer: [],
		r2: [],
		promptVersjon: 1,
		nesteBatch: 0,
		backfillManed: 0,
		hendelser: [],
	};
}

export function promptHash(versjon: number): string {
	return `p${versjon}-${(versjon * 2654435761) % 65536}`;
}

export type Handling =
	| { slag: "poll" }
	| { slag: "poll_stille" }
	| { slag: "poll_feiler" }
	| { slag: "backfill_steg" }
	| { slag: "berik_neste"; na: number }
	| { slag: "berik_neste_feiler"; na: number }
	| { slag: "ko_pa_nytt" }
	| { slag: "ny_promptversjon" }
	| { slag: "kjor_om_alle"; na: number };

export function reduser(f: Pipeline, h: Handling, kilde: Kilde): Pipeline {
	switch (h.slag) {
		case "poll": {
			const batch = kilde.batcher[f.nesteBatch] ?? [];
			const etter = tilLagret(f, batch, true);
			return {
				...etter,
				nesteBatch: Math.min(f.nesteBatch + 1, kilde.batcher.length),
				kjoringer: [
					...f.kjoringer,
					{
						nr: f.kjoringer.length + 1,
						slag: "poll",
						funnet: batch.length,
						nye: nyeAntall(f, etter),
					},
				],
			};
		}

		case "poll_stille":
			return {
				...f,
				kjoringer: [
					...f.kjoringer,
					{ nr: f.kjoringer.length + 1, slag: "poll", funnet: 0, nye: 0 },
				],
				hendelser: logg(f, "poll: kilden returnerte null meldinger"),
			};

		case "poll_feiler":
			return {
				...f,
				kjoringer: [
					...f.kjoringer,
					{
						nr: f.kjoringer.length + 1,
						slag: "poll",
						funnet: 0,
						nye: 0,
						feil: "uventet form på kildens svar",
					},
				],
				hendelser: logg(f, "poll: parsefeil, ingenting lagret"),
			};

		case "backfill_steg": {
			if (f.backfillManed >= BACKFILL_MANEDER)
				return { ...f, hendelser: logg(f, "backfill: ferdig") };
			const maned = f.backfillManed + 1;
			const batch = kilde.backfill(maned);
			const etter = tilLagret(f, batch, maned <= BERIK_VED_BACKFILL);
			return {
				...etter,
				backfillManed: maned,
				kjoringer: [
					...f.kjoringer,
					{
						nr: f.kjoringer.length + 1,
						slag: "backfill",
						funnet: batch.length,
						nye: nyeAntall(f, etter),
					},
				],
				hendelser: logg(
					etter,
					`backfill: måned -${maned}${maned <= BERIK_VED_BACKFILL ? " (i kø)" : " (berikes ved første lesing)"}`,
				),
			};
		}

		case "berik_neste": {
			const id = f.ko[0];
			if (!id) return { ...f, hendelser: logg(f, "køen er tom") };
			const melding = finn(f, id);
			if (!melding) return f;
			const svar = kilde.llmSvar[id];
			if (!svar)
				return { ...f, ko: f.ko.slice(1), hendelser: logg(f, `${id}: mangler fikstur-svar`) };
			return berik(f, melding, svar, h.na);
		}

		case "berik_neste_feiler": {
			const id = f.ko[0];
			if (!id) return { ...f, hendelser: logg(f, "køen er tom") };
			const melding = finn(f, id);
			if (!melding) return f;
			const forsok = melding.forsok + 1;
			const dodbrev = forsok >= MAKS_FORSOK;
			return {
				...f,
				ko: f.ko.slice(1),
				dodbrev: dodbrev ? [...f.dodbrev, id] : f.dodbrev,
				meldinger: bytt(f, id, (m) => ({
					...m,
					forsok,
					tilstand: dodbrev ? "dodbrev" : "berikelse_feilet",
				})),
				hendelser: logg(
					f,
					dodbrev
						? `${id}: dødbrevkø etter ${forsok} forsøk, fortsatt lesbar`
						: `${id}: berikelse feilet (forsøk ${forsok}), melding lesbar`,
				),
			};
		}

		case "ko_pa_nytt": {
			const feilede = f.meldinger.filter((m) => m.tilstand === "berikelse_feilet").map((m) => m.id);
			if (feilede.length === 0) return { ...f, hendelser: logg(f, "ingen feilede meldinger") };
			return {
				...f,
				ko: [...f.ko, ...feilede],
				meldinger: f.meldinger.map((m) =>
					m.tilstand === "berikelse_feilet" ? { ...m, tilstand: "i_ko" } : m,
				),
				hendelser: logg(f, `${feilede.length} melding(er) lagt i kø på nytt, kilden ikke rørt`),
			};
		}

		case "ny_promptversjon":
			return {
				...f,
				promptVersjon: f.promptVersjon + 1,
				hendelser: logg(f, `ny prompt: ${promptHash(f.promptVersjon + 1)}`),
			};

		case "kjor_om_alle": {
			const berikede = f.meldinger.filter((m) => m.tilstand === "beriket");
			if (berikede.length === 0) return { ...f, hendelser: logg(f, "ingenting å kjøre om") };
			let ut = f;
			for (const m of berikede) {
				const svar = kilde.llmSvar[m.id];
				if (svar) ut = berik(ut, m, svar, h.na, true);
			}
			return {
				...ut,
				hendelser: logg(
					ut,
					`kjørte om ${berikede.length} melding(er) med ${promptHash(f.promptVersjon)}`,
				),
			};
		}
	}
}

// ------------------------------------------------------------------- internt

function tilLagret(f: Pipeline, batch: KildeMelding[], iKo: boolean): Pipeline {
	let ut = f;
	for (const rad of batch) {
		// Rådata i R2 før noe parses. Dubletter skrives også, parsing kan kjøres om.
		const raNokkel = `ra/${rad.id}.json`;
		ut = { ...ut, r2: ut.r2.includes(raNokkel) ? ut.r2 : [...ut.r2, raNokkel] };

		if (finn(ut, rad.id)) {
			ut = { ...ut, hendelser: logg(ut, `${rad.id}: dublett avvist på kildeidentifikator`) };
			continue;
		}

		const kjentKategori = rad.kildekategori in KATEGORITABELL;
		const melding: Melding = {
			id: rad.id,
			selskap: rad.selskap,
			ticker: rad.ticker,
			marked: rad.marked,
			tittel: rad.tittel,
			kildekategori: rad.kildekategori,
			kjentKategori,
			brodtekst: rad.brodtekst,
			sprak: rad.sprak,
			publisert: rad.publisert,
			tilstand: iKo ? "i_ko" : "lagret",
			viktighet: viktighetVedLagring(rad.kildekategori),
			gulvOverstyrte: false,
			korrigerer: rad.korrigerer,
			vedlegg: rad.vedlegg,
			raNokkel,
			forsok: 0,
		};

		ut = {
			...ut,
			meldinger: [...ut.meldinger, melding],
			ko: iKo ? [...ut.ko, rad.id] : ut.ko,
			r2: [...ut.r2, ...rad.vedlegg.map((v) => `vedlegg/${rad.id}/${v}`)],
			hendelser: logg(
				ut,
				`${rad.id}: lagret som ${melding.viktighet}${kjentKategori ? "" : " (ukjent kategori)"}${iKo ? ", i kø" : ""}`,
			),
		};

		if (rad.korrigerer) {
			ut = {
				...ut,
				meldinger: bytt(ut, rad.korrigerer, (m) => ({ ...m, korrigertAv: rad.id })),
				hendelser: logg(ut, `${rad.id}: korrigerer ${rad.korrigerer}`),
			};
		}
	}
	return ut;
}

function berik(
	f: Pipeline,
	melding: Melding,
	svar: LlmSvar,
	na: number,
	omkjoring = false,
): Pipeline {
	const tall: Tall[] = svar.tall.map((t) => ({
		...t,
		godkjent: sitatFinnes(melding.brodtekst, t.sitat),
	}));
	const forkastede = tall.filter((t) => !t.godkjent).length;
	const { viktighet, overstyrt } = klemViktighet(melding.kildekategori, svar.viktighet);

	const berikelse: Berikelse = {
		meldingId: melding.id,
		modell: "claude-sonnet-5",
		promptHash: promptHash(f.promptVersjon),
		hva_skjedde: svar.hva_skjedde,
		tall,
		begreper: svar.begreper,
		forkastede,
		tokens: svar.tokens,
		tidspunkt: na,
	};

	const ukjente = { ...f.ukjenteBegreper };
	for (const b of svar.ukjente_begreper) ukjente[b] = (ukjente[b] ?? 0) + 1;

	return {
		...f,
		ko: omkjoring ? f.ko : f.ko.slice(1),
		berikelser: [...f.berikelser, berikelse], // historiske rader beholdes
		ukjenteBegreper: ukjente,
		meldinger: bytt(f, melding.id, (m) => ({
			...m,
			tilstand: "beriket",
			viktighet,
			modellensViktighet: svar.viktighet,
			gulvOverstyrte: overstyrt,
		})),
		hendelser: logg(
			f,
			`${melding.id}: beriket${overstyrt ? ` (gulv overstyrte modellens "${svar.viktighet}")` : ""}${
				forkastede > 0 ? `, ${forkastede} tall forkastet` : ""
			}`,
		),
	};
}

function finn(f: Pipeline, id: string): Melding | undefined {
	return f.meldinger.find((m) => m.id === id);
}

function bytt(f: Pipeline, id: string, endre: (m: Melding) => Melding): Melding[] {
	return f.meldinger.map((m) => (m.id === id ? endre(m) : m));
}

function nyeAntall(for_: Pipeline, etter: Pipeline): number {
	return etter.meldinger.length - for_.meldinger.length;
}

function logg(f: Pipeline, linje: string): string[] {
	return [...f.hendelser, linje].slice(-6);
}

// ------------------------------------------------------------------- avledet

export function sisteBerikelse(f: Pipeline, id: string): Berikelse | undefined {
	return [...f.berikelser].reverse().find((b) => b.meldingId === id);
}

export function berikelserFor(f: Pipeline, id: string): Berikelse[] {
	return f.berikelser.filter((b) => b.meldingId === id);
}

/** Story 23: forkastningsraten er kvalitetsmålet på prompten. */
export function forkastningsrate(f: Pipeline): { forkastede: number; totalt: number } {
	const hash = promptHash(f.promptVersjon);
	const gjeldende = f.berikelser.filter((b) => b.promptHash === hash);
	return {
		forkastede: gjeldende.reduce((n, b) => n + b.forkastede, 0),
		totalt: gjeldende.reduce((n, b) => n + b.tall.length, 0),
	};
}

/** Story 30: kostnad per beriket melding skal være synlig. Grov blandet pris per million tokens. */
const USD_PER_MTOKEN = 3;

export function kostnadUsd(f: Pipeline): number {
	return f.berikelser.reduce((n, b) => n + (b.tokens / 1_000_000) * USD_PER_MTOKEN, 0);
}

/** Story 24: den stille feilen som må bråke. */
export function stilleFeil(f: Pipeline): string | undefined {
	const siste = f.kjoringer.slice(-3);
	if (siste.some((k) => k.feil)) return "parsefeil fra kilden - formatet kan ha endret seg";
	if (siste.length === 3 && siste.every((k) => k.slag === "poll" && k.nye === 0))
		return "tre kjøringer uten nye meldinger - kilden kan ha sluttet å svare";
	return undefined;
}
