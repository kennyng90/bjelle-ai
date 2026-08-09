# apps/workers

Inntakstjenesten for Bjelle. Henter børsmeldinger fra Oslo Børs, lagrer dem varig, setter
viktighet deterministisk, og beriker dem med et klarspråk-sammendrag fra en språkmodell.

Denne filen er kontrakten. Den slår generelle råd fra skillene ved uenighet.
Hvorfor-et står i [docs/CONCEPT.md](../../docs/CONCEPT.md), hva-et i
[docs/BESLUTNINGER.md](../../docs/BESLUTNINGER.md), og den gjeldende spec-en i
GitHub issue #2 (`gh issue view 2`).

## Tre inngangspunkter

| Inngangspunkt | Ansvar | Hard regel |
| --- | --- | --- |
| `scheduled` (cron hvert 5. min) | Poll kilden, lagre rått, sett viktighet, legg i kø | Skal alltid bli ferdig raskt. Aldri LLM-kall her |
| `queue` (køkonsument) | Berik én melding, verifiser sitater, skriv berikelse | Begrensede forsøk, så dødbrevkø |
| `fetch` (HTTP) | Helsesjekk og operatørendepunkter | Ingen offentlig flate i dette steget |

Rekkefølgen er selve produktløftet: en melding er lesbar med tittel, selskap, kategori,
viktighet og lenke *før* modellen har sagt noe. Alt som gjør berikelsen til en
forutsetning for å lagre, er feil, uansett hvor pent det ser ut.

## Kjøretidsmiljøet

Workers er ikke Node. Det som brenner deg her:

1. **Isolater gjenbrukes på tvers av forespørsler.** Ingen mutbar tilstand i modulscope.
   En cache, en teller eller en klientinstans på toppnivå lekker mellom kjøringer og
   forsvinner uforutsigbart. Tilstand hører hjemme i D1, R2 eller KV.
2. **Ubundne promises drepes.** Alt du starter uten å `await`, må inn i `ctx.waitUntil`,
   ellers kan isolatet rives når handleren returnerer.
3. **Hemmeligheter er ikke miljøvariabler.** `ANTHROPIC_API_KEY` settes med
   `wrangler secret put`, aldri i `wrangler.jsonc`, aldri i en `.env` som committes.
4. **`Env` er generert.** Legg til en binding i `wrangler.jsonc`, kjør
   `pnpm --filter @bjelle/workers cf-typegen`, og commit `worker-configuration.d.ts`.
   Ikke håndskriv typen.
5. **CPU-tid og subrequests er begrenset.** Backfill av 12 måneder må gå i biter som
   hver blir ferdig, med egen framdrift lagret. Én kjøring som prøver alt, dør.
6. **`observability` er allerede på.** Logg strukturert, ikke i fritekst.

Sjekk alltid gjeldende grenser og API-signaturer mot developers.cloudflare.com. Både
`cloudflare`- og `workers-best-practices`-skillen sier eksplisitt at pretrent kunnskap
om Cloudflare er utdatert.

Bruk `cloudflare-docs`-skillen til oppslaget. Den greper indeksene lokalt og henter
sidene som markdown, så et oppslag koster to kall og noen hundre tokens i stedet for
hele produktindeksen. Ikke hent developers.cloudflare.com med WebFetch.

For pakkeversjoner og kompatibilitet er dokumentasjonen feil verktøy. `npm view <pakke>
versions --json` og `npm view <pakke> peerDependencies` er eksakte.

## Språk: engelsk kode, norsk lesbar tekst

Delt nøyaktig på grensen mellom identifikator og prosa.

**Engelsk.** Alt som er kode: `const`, `let`, funksjoner, parametre, typer, filnavn,
D1-tabeller og kolonner (`message`, `enrichment`, `unknown_term`), tilstandsverdier
(`stored`, `queued`, `enriched`, `enrichment_failed`), viktighetsverdier (`important`,
`good_to_know`, `noise`), kategorinøkler (`share_issue`), og feltnavnene i LLM-skjemaet
(`what_happened`, `figures`, `quote`, `terms`).

**Norsk.** Alt et menneske leser: kommentarer, JSDoc, testtitler i `describe` og `it`,
commit-meldinger, og selvsagt alt produktinnhold - sammendraget modellen skriver,
ordlisteforklaringene, og etikettene en kategori vises med.

**To presiseringer som faktisk kommer opp:**

- Kategorinøkkelen er engelsk kode, visningsnavnet er norsk innhold. `share_issue` i
  databasen, `"Emisjon"` i en oversettelsestabell. Ikke bland dem.
- **Nøklene i ordlista er norske.** De er selve fagordene (`emisjon`, `fortrinnsrett`),
  altså innhold, ikke identifikatorer. Samme gjelder `label` på et tall
  (`"emisjonsbeløp"`), som er tekst modellen produserer for visning.

Instruksjonen om at sammendraget skal være norsk klarspråk hører hjemme i prompten og i
feltbeskrivelsene i skjemaet, ikke i nøkkelnavnene.

## Grenser som ikke får viskes ut

Disse fem er hele grunnen til at spec-en ser ut som den gjør. Bryter du en, har du bygget
noe annet enn det som ble bestilt.

- **Ingen modul utenom kildelaget kjenner Newsweb.** Interfacet eksponerer to
  operasjoner: hent meldinger nyere enn et tidspunkt, og hent hele meldingen med
  vedleggsreferanser. Newsweb-spesifikke felter stopper der. Dette er prisen vi betaler
  for å kunne bytte kilde på uker hvis vilkårene tvinger det fram.
- **Rålageret skrives før noe parses.** Payload og vedlegg til R2 først. Parsingen skal
  alltid kunne kjøres om fra rålageret, også med en helt ny parser.
- **Viktighetsgulvet slår modellen.** Kategoritabellen setter viktighet ved lagring.
  Berikelsen kan bare bevege seg innenfor `{min, maks}` for kategorien. En emisjon kan
  aldri bli støy. En ukjent kildekategori faller til `good_to_know`, aldri til `noise`.
- **Sitatverifisering er eksakt.** Streng-for-streng mot brødteksten etter normalisering
  av mellomrom og ikke-brytende tegn. Ingen uskarp sammenligning, ingen terskel. Slår den
  ut, forkastes hele talloppføringen, ikke bare sitatet, og telleren økes.
- **Skjemaet har ingen felter for råd.** Ingen vurdering, konsekvens, framtidsutsikt eller
  kurspåvirkning. Legger du til et felt der modellen *kunne* skrevet en anbefaling, har du
  fjernet den strukturelle garantien produktet hviler på.

## Sømmen

Én søm, allerede avtalt i issue #2 og ikke oppe til ny vurdering:

`apps/workers` testes gjennom sine faktiske inngangspunkter med
`@cloudflare/vitest-pool-workers`. Ekte D1, R2 og køer i Miniflare. Utgående HTTP mot
Newsweb og Anthropic fanges på nettverksgrensen. Testene utløser `scheduled` eller leverer
meldinger til køkonsumenten, og hevder mot databasen og objektlageret.

Kategoritabell, sitatverifisering og skjemavalidering får **ingen** egne enhetstester. De
dekkes gjennom cronen med fixtures. To sømmer over samme regelsett driver fra hverandre.

Fixtures er ekte payloader i repoet: minst én per kildekategori, pluss en engelskspråklig
melding, en med vedlegg, en korreksjon og en med tett formaterte tall. Modellsvarene er
også fixtures, og ett av dem inneholder et oppdiktet sitat, slik at forkastingen faktisk
blir testet i stedet for bare beskrevet.

## Kommandoer

```bash
pnpm --filter @bjelle/workers dev          # wrangler dev
pnpm --filter @bjelle/workers test         # vitest-pool-workers
pnpm --filter @bjelle/workers typecheck
pnpm --filter @bjelle/workers build        # wrangler deploy --dry-run
pnpm --filter @bjelle/workers cf-typegen   # regenerer Env etter ny binding
pnpm check && pnpm typecheck               # hele repoet
```

Alt går via `pnpm` eller `pnpm exec`. Aldri bart `node`, `npx` eller globalt installert
`wrangler`.

Nye avhengigheter legges i `catalog:` i `pnpm-workspace.yaml`, ikke med versjon i
`package.json`. Merk at `trustPolicy: no-downgrade` og `minimumReleaseAge` gjelder:
en pakke sluppet det siste døgnet blir avvist, og det er meningen.

## CI

`.github/workflows/ci.yml` har fire jobber i dag: `kvalitet`, `bygg`, `komponenttester`
og `e2e`. Workers-testene er en femte jobb, ikke et tillegg til en eksisterende. Bruk
`./.github/actions/oppsett` som de andre.

`bygg` kjører allerede `wrangler deploy --dry-run` for denne appen. Den fanger bindings
som er brukt i koden men ikke deklarert i `wrangler.jsonc`, så en grønn typecheck alene
er ikke bevis på at workeren lar seg deploye.
