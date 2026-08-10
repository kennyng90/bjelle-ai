# Dashboardet leser inntaksdatabasen direkte

`apps/dashboard` deployes som sin egen Cloudflare Worker med en D1-binding til den samme
`bjelle`-databasen som `apps/workers` skriver til, og en lese-binding til den samme
R2-bøtta. Alternativene var en autentisert HTTP-flate eller en service binding foran all
lesing, men begge legger et hopp mellom to workere som uansett deler database: better-auth
krever D1 i dashboardet, så en variant der dashboardet er databaseløst finnes ikke.

## Konsekvenser

- D1-skjemaet er ikke lenger internt i `apps/workers`. Det er en delt kontrakt, og en
  kolonne kan ikke endres uten å se på begge appene.
- Eierskapet er delt etter tabell, ikke etter database. `apps/workers` eier og skriver
  `company`, `message`, `attachment`, `enrichment`, `term_hit`, `unknown_term`, `run` og
  `backfill_progress`. `apps/dashboard` leser dem med `SELECT` og skriver dem aldri, og
  eier til gjengjeld bruker-, sesjons-, overvåknings-, telle- og hendelsestabellene alene.
- Hver app har sin egen `migrations_dir` og sin egen `migrations_table`, slik at de kan
  deployes uavhengig. Prisen er at ingen enkelt kommando viser hele skjemaet.
- Den ene skrivingen dashboardet trenger inn i inntaksdomenet, lat berikelse av en gammel
  melding, går gjennom en service binding til `apps/workers`. Regelen om at kun én app
  skriver til inntakstabellene overlever dermed også det unntaket.
- R2-bindingen gir dashboardet tilgang til råpayloadene i samme bøtte som vedleggene.
  Vedleggsruten må derfor slå opp nøkkelen i `attachment`-tabellen og aldri ta imot en
  nøkkel fra klienten.
