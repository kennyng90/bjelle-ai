/**
 * Domenetypene hele tjenesten deler. Ingenting her kjenner Newsweb, D1 eller
 * Anthropic - det er poenget med at de bor for seg.
 */

export type Importance = "important" | "good_to_know" | "noise";

/**
 * Tilstandsmaskinen fra issue #2. `discovered` er med for at maskinen skal være
 * komplett, men lagres aldri: en rad finnes først etter at rålageret er skrevet.
 */
export type MessageState =
	| "discovered"
	| "stored"
	| "queued"
	| "enriched"
	| "enrichment_failed"
	| "dead_letter";

export type Market = "main_list" | "expand" | "growth" | "other";

export type CompanyStatus = "listed" | "delisted";

export type Language = "no" | "en";

/**
 * Kildens kategorier, normalisert til våre egne nøkler. En ny kilde skal kunne
 * kaste sin egen taksonomi inn i denne lista i stedet for å tvinge resten av
 * systemet til å kjenne kildens id-er.
 *
 * `unknown` er ikke en feil. Kilden legger til kategorier uten forvarsel, og en
 * melding vi ikke kjenner kategorien på skal fortsatt vises.
 */
export type SourceCategory =
	| "annual_report"
	| "half_year_report"
	| "quarterly_report"
	| "home_member_state"
	| "inside_information"
	| "major_shareholding"
	| "own_shares"
	| "voting_rights_and_capital"
	| "rights_changes"
	| "additional_regulated_information"
	| "ex_date"
	| "managers_transaction"
	| "prospectus"
	| "press_release"
	| "interest_rate_adjustment"
	| "trading_halt"
	| "exchange_announcement"
	| "third_party_announcement"
	| "fsa_announcement"
	| "central_bank_announcement"
	| "unknown";
