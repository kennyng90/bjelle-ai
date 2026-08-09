/**
 * PROTOTYPE - kastes når spørsmålet er besvart. Se NOTES.md.
 *
 * Kastbart terminalskall rundt pipeline.ts. Kjør: pnpm prototype:inntak
 */

import { emitKeypressEvents } from "node:readline";
import { kilde } from "./fikstur.ts";
import {
	type Berikelse,
	berikelserFor,
	forkastningsrate,
	type Handling,
	kostnadUsd,
	MAKS_FORSOK,
	type Melding,
	type Pipeline,
	promptHash,
	reduser,
	sisteBerikelse,
	stilleFeil,
	tomPipeline,
	type Viktighet,
} from "./pipeline.ts";

const fet = (s: string) => `\x1b[1m${s}\x1b[0m`;
const svak = (s: string) => `\x1b[2m${s}\x1b[0m`;
const rod = (s: string) => `\x1b[31m${s}\x1b[0m`;
const gronn = (s: string) => `\x1b[32m${s}\x1b[0m`;
const gul = (s: string) => `\x1b[33m${s}\x1b[0m`;
const invers = (s: string) => `\x1b[7m${s}\x1b[0m`;

const VIKTIGHET_FARGE: Record<Viktighet, (s: string) => string> = {
	viktig: rod,
	greit_a_vite: gul,
	stoy: svak,
};

let pipeline: Pipeline = tomPipeline();
let valgt = 0;
let klokke = Date.UTC(2026, 7, 9, 7, 0, 0);

function send(h: Handling) {
	klokke += 60_000;
	pipeline = reduser(pipeline, h, kilde);
	if (valgt >= pipeline.meldinger.length) valgt = Math.max(0, pipeline.meldinger.length - 1);
}

// Bygges dynamisk: en regex-literal med ESC i seg felles av biome-linten.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

function pad(s: string, n: number): string {
	const rent = s.replace(ANSI, "");
	if (rent.length > n) return `${s.slice(0, Math.max(0, n - 1 + (s.length - rent.length)))}…`;
	return s + " ".repeat(n - rent.length);
}

function tilstandTekst(m: Melding): string {
	switch (m.tilstand) {
		case "beriket":
			return gronn("beriket");
		case "berikelse_feilet":
			return gul(`feilet ${m.forsok}/${MAKS_FORSOK}`);
		case "dodbrev":
			return rod("dødbrev");
		case "i_ko":
			return "i_kø";
		default:
			return svak("lagret");
	}
}

function tegnListe(): string[] {
	const linjer: string[] = [];
	linjer.push(
		svak(
			`  ${pad("id", 14)}${pad("selskap", 16)}${pad("kildekategori", 32)}${pad("tilstand", 14)}viktighet`,
		),
	);

	const vindu = 10;
	const start = Math.max(
		0,
		Math.min(valgt - Math.floor(vindu / 2), pipeline.meldinger.length - vindu),
	);
	const synlige = pipeline.meldinger.slice(Math.max(0, start), Math.max(0, start) + vindu);

	for (const m of synlige) {
		const i = pipeline.meldinger.indexOf(m);
		const merke = m.gulvOverstyrte ? " ⚑" : "";
		const korrigert = m.korrigertAv ? svak(" ↺") : "";
		const rad =
			pad(`${m.id}${korrigert}`, 14) +
			pad(m.selskap, 16) +
			pad(m.kjentKategori ? m.kildekategori : gul(`${m.kildekategori}?`), 32) +
			pad(tilstandTekst(m), 14) +
			VIKTIGHET_FARGE[m.viktighet](m.viktighet + merke);
		linjer.push(i === valgt ? invers(`> ${rad}`) : `  ${rad}`);
	}
	if (pipeline.meldinger.length === 0)
		linjer.push(svak("  (ingen meldinger - trykk [p] for å polle)"));
	if (pipeline.meldinger.length > vindu)
		linjer.push(svak(`  … ${pipeline.meldinger.length} meldinger totalt`));
	return linjer;
}

function tegnDetalj(): string[] {
	const m = pipeline.meldinger[valgt];
	if (!m) return [];
	const b: Berikelse | undefined = sisteBerikelse(pipeline, m.id);
	const historikk = berikelserFor(pipeline, m.id);
	const linjer: string[] = [];

	linjer.push(fet(m.tittel) + svak(`  ${m.marked} / ${m.ticker} / ${m.sprak} / ${m.publisert}`));
	linjer.push(
		svak("rådata ") +
			m.raNokkel +
			(m.vedlegg.length ? svak(`   vedlegg `) + m.vedlegg.join(", ") : "") +
			(m.korrigerer ? svak("   korrigerer ") + m.korrigerer : "") +
			(m.korrigertAv ? rod(`   erstattet av ${m.korrigertAv}`) : ""),
	);

	if (m.gulvOverstyrte)
		linjer.push(
			gul(`⚑ modellen sa "${m.modellensViktighet}", kategoritabellen ga "${m.viktighet}"`),
		);

	if (!b) {
		linjer.push(
			svak("(ingen berikelse ennå - meldingen er likevel lesbar med tittel, selskap og viktighet)"),
		);
		return linjer;
	}

	linjer.push("");
	linjer.push(fet("hva skjedde  ") + b.hva_skjedde);
	for (const t of b.tall) {
		const merke = t.godkjent ? gronn("✓") : rod("✗ forkastet");
		linjer.push(
			`  ${merke} ${pad(t.merkelapp, 20)} ${pad(`${t.verdi} ${t.enhet}`, 18)} ${svak(`«${t.sitat}»`)}`,
		);
	}
	if (b.tall.length === 0) linjer.push(svak("  (ingen tall)"));
	linjer.push(
		svak("begreper ") +
			(b.begreper.join(", ") || "-") +
			svak("   modell ") +
			b.modell +
			svak("   prompt ") +
			b.promptHash +
			svak("   berikelser ") +
			String(historikk.length),
	);
	return linjer;
}

function tegn() {
	const rate = forkastningsrate(pipeline);
	const sisteKjoring = pipeline.kjoringer.at(-1);
	const alarm = stilleFeil(pipeline);

	const ut: string[] = [];
	ut.push(
		fet("BJELLE - inntak, klassifisering og berikelse") +
			svak("   PROTOTYPE, ikke produksjonskode"),
	);
	ut.push(svak("─".repeat(100)));
	ut.push(
		`${fet("kø")} ${pad(String(pipeline.ko.length), 4)}${fet("dødbrev")} ${pad(String(pipeline.dodbrev.length), 4)}` +
			`${fet("kjøringer")} ${pad(String(pipeline.kjoringer.length), 4)}` +
			`${fet("backfill")} ${pad(`måned -${pipeline.backfillManed}/12`, 14)}` +
			`${fet("prompt")} ${pad(promptHash(pipeline.promptVersjon), 12)}` +
			`${fet("kostnad")} $${kostnadUsd(pipeline).toFixed(4)}`,
	);
	ut.push(
		`${fet("forkastede tall")} ${pad(`${rate.forkastede}/${rate.totalt} på gjeldende prompt`, 30)}` +
			`${fet("ukjente begreper")} ${
				Object.entries(pipeline.ukjenteBegreper)
					.map(([k, n]) => `${k}×${n}`)
					.join(", ") || "-"
			}`,
	);
	if (sisteKjoring)
		ut.push(
			svak(
				`siste kjøring: ${sisteKjoring.slag} #${sisteKjoring.nr}, fant ${sisteKjoring.funnet}, ${sisteKjoring.nye} nye${
					sisteKjoring.feil ? ` - FEIL: ${sisteKjoring.feil}` : ""
				}`,
			),
		);
	if (alarm) ut.push(rod(fet(`ALARM  ${alarm}`)));

	ut.push(svak("─".repeat(100)));
	ut.push(...tegnListe());
	ut.push(svak("─".repeat(100)));
	ut.push(...tegnDetalj());
	ut.push(svak("─".repeat(100)));
	for (const h of pipeline.hendelser) ut.push(svak(`· ${h}`));

	ut.push("");
	ut.push(
		[
			`${fet("[p]")} poll`,
			`${fet("[s]")} poll uten treff`,
			`${fet("[x]")} poll med parsefeil`,
			`${fet("[b]")} backfill ett steg`,
		].join("   "),
	);
	ut.push(
		[
			`${fet("[k]")} berik neste i kø`,
			`${fet("[m]")} modellen er nede`,
			`${fet("[r]")} kø feilede på nytt`,
		].join("   "),
	);
	ut.push(
		[
			`${fet("[n]")} ny promptversjon`,
			`${fet("[o]")} kjør om berikede`,
			`${fet("[↑↓]")} velg melding`,
			`${fet("[q]")} avslutt`,
		].join("   "),
	);

	process.stdout.write(`\x1b[2J\x1b[H${ut.join("\n")}\n`);
}

const taster: Record<string, () => void> = {
	p: () => send({ slag: "poll" }),
	s: () => send({ slag: "poll_stille" }),
	x: () => send({ slag: "poll_feiler" }),
	b: () => send({ slag: "backfill_steg" }),
	k: () => send({ slag: "berik_neste", na: klokke }),
	m: () => send({ slag: "berik_neste_feiler", na: klokke }),
	r: () => send({ slag: "ko_pa_nytt" }),
	n: () => send({ slag: "ny_promptversjon" }),
	o: () => send({ slag: "kjor_om_alle", na: klokke }),
};

emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();

process.stdin.on("keypress", (_str, tast) => {
	if (!tast) return;
	if (tast.name === "q" || (tast.ctrl && tast.name === "c")) {
		process.stdout.write("\x1b[2J\x1b[H");
		process.exit(0);
	}
	if (tast.name === "up") valgt = Math.max(0, valgt - 1);
	else if (tast.name === "down") valgt = Math.min(pipeline.meldinger.length - 1, valgt + 1);
	else taster[tast.name]?.();
	tegn();
});

tegn();
