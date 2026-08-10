-- Inntak og berikelse av børsmeldinger. Formene er avgjort i GitHub issue #2.
--
-- Ingen fremmednøkkel fra message til company. En melding fra et nynotert selskap
-- skal aldri kunne avvises fordi selskapslista ikke har rukket å oppdatere seg.
-- Det samme gjelder korreksjonspekerne: meldingen som retter kan komme først.

CREATE TABLE company (
	-- Kildens utstederidentifikator. Vår nøkkel, ikke ticker: ticker byttes.
	issuer_id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	ticker TEXT,
	market TEXT NOT NULL CHECK (market IN ('main_list', 'expand', 'growth', 'other')),
	status TEXT NOT NULL CHECK (status IN ('listed', 'delisted')),
	updated_at TEXT NOT NULL
);

CREATE TABLE message (
	-- Kildens meldingsidentifikator. Unik her er hele dublettvernet: to
	-- overlappende cron-kjøringer som finner samme melding gir én rad.
	source_id TEXT PRIMARY KEY,
	issuer_id TEXT NOT NULL,
	published_at TEXT NOT NULL,
	title TEXT NOT NULL,
	source_category TEXT NOT NULL,
	body TEXT NOT NULL,
	language TEXT NOT NULL,
	source_url TEXT NOT NULL,

	-- discovered er med for at maskinen skal være komplett. Den lagres aldri:
	-- en rad finnes først etter at rålageret er skrevet, altså fra stored.
	state TEXT NOT NULL CHECK (
		state IN ('discovered', 'stored', 'queued', 'enriched', 'enrichment_failed', 'dead_letter')
	),

	-- Settes ved stored av kategoritabellen alene. Berikelsen kan bare bevege
	-- den innenfor {min, max} for kategorien, aldri overstyre gulvet.
	importance TEXT NOT NULL CHECK (importance IN ('important', 'good_to_know', 'noise')),

	-- Hva modellen opprinnelig sa, lagret kun når klemmingen faktisk endret svaret.
	-- Uten dette er "modellen ble overkjørt" usynlig, og det er nettopp den
	-- hendelsen som forteller om kategoritabellen er riktig kalibrert.
	clamped_from TEXT CHECK (clamped_from IN ('important', 'good_to_know', 'noise')),

	attempts INTEGER NOT NULL DEFAULT 0,

	-- Peker til rålageret i R2. Parsingen skal alltid kunne kjøres om herfra.
	raw_key TEXT NOT NULL,

	-- Begge retninger trengs. Med bare corrects må en feed lese hele tabellen
	-- for å finne ut om en melding er utdatert.
	corrects TEXT,
	corrected_by TEXT,

	stored_at TEXT NOT NULL
);

CREATE INDEX message_issuer_published ON message (issuer_id, published_at DESC);
CREATE INDEX message_published ON message (published_at DESC);
CREATE INDEX message_state ON message (state);

CREATE TABLE attachment (
	message_id TEXT NOT NULL,
	-- Kildens vedleggsidentifikator. Sammen med meldingen er den unik.
	source_id TEXT NOT NULL,
	filename TEXT NOT NULL,
	media_type TEXT,
	r2_key TEXT NOT NULL,
	PRIMARY KEY (message_id, source_id)
);

CREATE TABLE enrichment (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	message_id TEXT NOT NULL,

	-- Produktkategorien modellen valgte. Ikke det samme som message.source_category,
	-- som er kildens regulatoriske kategori.
	category TEXT NOT NULL,
	importance TEXT NOT NULL CHECK (importance IN ('important', 'good_to_know', 'noise')),
	what_happened TEXT NOT NULL,

	-- JSON-array. Kun tall som overlevde sitatverifiseringen ligger her.
	figures TEXT NOT NULL,

	model TEXT NOT NULL,
	prompt_hash TEXT NOT NULL,
	input_tokens INTEGER NOT NULL,
	output_tokens INTEGER NOT NULL,
	cost_usd REAL NOT NULL,
	discarded_figures INTEGER NOT NULL,
	created_at TEXT NOT NULL
);

-- Rader overskrives aldri ved omkjøring. Nyeste rad per melding vinner, og de
-- gamle blir liggende slik at to promptversjoner kan sammenlignes mot ekte data.
CREATE INDEX enrichment_message ON enrichment (message_id, id DESC);
CREATE INDEX enrichment_prompt ON enrichment (prompt_hash);

CREATE TABLE term_hit (
	enrichment_id INTEGER NOT NULL REFERENCES enrichment (id) ON DELETE CASCADE,
	-- Nøkkelen er selve fagordet på norsk. Innhold, ikke identifikator.
	term TEXT NOT NULL,
	PRIMARY KEY (enrichment_id, term)
);

-- Arbeidskøen for redaksjonelt påfyll av ordlista.
CREATE TABLE unknown_term (
	term TEXT PRIMARY KEY,
	occurrences INTEGER NOT NULL DEFAULT 1,
	first_seen_at TEXT NOT NULL,
	last_seen_at TEXT NOT NULL
);

-- Én rad per kjøring. Grunnlaget for å oppdage den stille feilen: null nye
-- meldinger mens børsen er åpen, eller en kjøring som feilet på parsing.
CREATE TABLE run (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	kind TEXT NOT NULL CHECK (kind IN ('poll', 'backfill', 'company_sync')),
	started_at TEXT NOT NULL,
	finished_at TEXT,

	-- Vinduet kjøringen leste. For backfill er det måneden som ble tatt, og
	-- eldste fullførte window_from er hvor neste kjøring gjenopptar.
	window_from TEXT,
	window_to TEXT,

	found INTEGER NOT NULL DEFAULT 0,
	stored INTEGER NOT NULL DEFAULT 0,
	duration_ms INTEGER,

	-- Ikke-null betyr feilet. En kjøring som feilet på parsing skal ligge her
	-- med feil og null lagret, ikke som en vellykket kjøring uten nye meldinger.
	error TEXT
);

CREATE INDEX run_kind_started ON run (kind, started_at DESC);

-- Framdriften til backfillen. Én rad, alltid. Ligger for seg fordi run-tabellen
-- er én rad per kjøring, og en backfill-bit trenger flere kjøringer på å bli
-- tom: hver kjøring tar et tak av nye meldinger, og biten er først ferdig når
-- en kjøring ikke finner noe nytt i den.
CREATE TABLE backfill_progress (
	id INTEGER PRIMARY KEY CHECK (id = 1),
	window_from TEXT NOT NULL,
	window_to TEXT NOT NULL,
	-- Satt når hele det tolv måneder lange vinduet er hentet inn.
	finished INTEGER NOT NULL DEFAULT 0,
	-- Kjøringer på rad der biten hadde meldinger igjen, men ingen lot seg lagre.
	-- Uten telleren står backfillen fast for alltid på én giftig melding.
	stalled INTEGER NOT NULL DEFAULT 0,
	updated_at TEXT NOT NULL
);
