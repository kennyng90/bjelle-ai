import type { Importance, SourceCategory } from "./domain.ts";

/**
 * Kategoritabellen. `default` settes ved lagring, av denne tabellen alene, og
 * modellens skjønn klemmes inn i {min, max}. Et gulv alene holder ikke: en ren
 * formalitet må kunne klemmes *nedover* også, ellers lærer folk seg å ignorere
 * tjenesten.
 */
export interface ImportanceRange {
	default: Importance;
	min: Importance;
	max: Importance;
}

const RANG: Record<Importance, number> = { noise: 0, good_to_know: 1, important: 2 };

const ALLTID_VIKTIG: ImportanceRange = {
	default: "important",
	min: "important",
	max: "important",
};
const ALLTID_STØY: ImportanceRange = { default: "noise", min: "noise", max: "noise" };
const MODELLEN_VURDERER: ImportanceRange = {
	default: "good_to_know",
	min: "noise",
	max: "important",
};

/**
 * Issue #2 lister kategoriene på produktspråk - emisjon, oppkjøp, resultatvarsel.
 * Kilden har ikke slike kategorier. Newsweb er regulatorisk inndelt, og alt som
 * er kurssensitivt meldes samlet under INNSIDEINFORMASJON, fordi loven krever
 * det. Derfor er det den kategorien som bærer gulvet: en emisjon kan ikke
 * publiseres noe annet sted, og blir dermed alltid viktig.
 *
 * Produktkategorien - `share_issue`, `acquisition` - er modellens jobb og lever
 * på berikelsen. Gulvet er kildens jobb og lever her.
 */
export const CATEGORY_TABLE: Record<SourceCategory, ImportanceRange> = {
	// Emisjon, oppkjøp og bud, resultatvarsel, konkursvarsel og endring i
	// toppledelsen meldes alle her.
	inside_information: ALLTID_VIKTIG,
	trading_halt: ALLTID_VIKTIG,

	// Rene formaliteter. Ingen av dem endrer noe for en eier.
	own_shares: ALLTID_STØY,
	voting_rights_and_capital: ALLTID_STØY,
	rights_changes: ALLTID_STØY,
	ex_date: ALLTID_STØY,
	interest_rate_adjustment: ALLTID_STØY,
	home_member_state: ALLTID_STØY,

	// Flagging står bevisst ikke som støy. Kilden melder kun flagging som faktisk
	// krysser en terskel, og en eier som går fra 4 til 33 prosent i et
	// Growth-selskap er ikke en formalitet.
	major_shareholding: MODELLEN_VURDERER,

	annual_report: MODELLEN_VURDERER,
	half_year_report: MODELLEN_VURDERER,
	quarterly_report: MODELLEN_VURDERER,
	managers_transaction: MODELLEN_VURDERER,
	prospectus: MODELLEN_VURDERER,
	press_release: MODELLEN_VURDERER,
	additional_regulated_information: MODELLEN_VURDERER,
	third_party_announcement: MODELLEN_VURDERER,
	fsa_announcement: MODELLEN_VURDERER,
	central_bank_announcement: MODELLEN_VURDERER,

	// Både tekniske kunngjøringer og suspensjonsvarsler kommer herfra, så den kan
	// ikke settes til støy uten å risikere at et handelsstopp forsvinner.
	exchange_announcement: MODELLEN_VURDERER,

	// Egen skala, ikke standardskalaen. En kategori vi ikke kjenner kan heves,
	// men aldri senkes til støy: den skal være synlig til noen har sett på den.
	unknown: { default: "good_to_know", min: "good_to_know", max: "important" },
};

export function importanceRange(category: SourceCategory): ImportanceRange {
	return CATEGORY_TABLE[category] ?? CATEGORY_TABLE.unknown;
}

/** Viktigheten en melding får ved lagring, før modellen har sagt noe. */
export function defaultImportance(category: SourceCategory): Importance {
	return importanceRange(category).default;
}

/**
 * Klemmer modellens svar inn i det kategorien tillater. Returnerer også hva
 * modellen opprinnelig sa når klemmingen faktisk endret svaret - uten det er
 * "modellen ble overkjørt" usynlig, og det er nettopp den hendelsen som
 * forteller om tabellen er riktig kalibrert.
 */
export function clampImportance(
	category: SourceCategory,
	modelImportance: Importance,
): { importance: Importance; clampedFrom: Importance | null } {
	const { min, max } = importanceRange(category);
	const rang = Math.min(Math.max(RANG[modelImportance], RANG[min]), RANG[max]);
	const importance = (Object.keys(RANG) as Importance[]).find((i) => RANG[i] === rang) ?? min;
	return {
		importance,
		clampedFrom: importance === modelImportance ? null : modelImportance,
	};
}
