# Bjelle

AI-overvåkning av Oslo Børs for nybegynnere. Dette er ordboka for domenet: hva ordene
betyr når vi snakker om produktet, og hvilket ord som er det riktige når flere finnes.

Hvorfor-et står i [docs/CONCEPT.md](docs/CONCEPT.md), hva-et i
[docs/BESLUTNINGER.md](docs/BESLUTNINGER.md), og arkitekturvalgene i [docs/adr](docs/adr).

Språkregelen i repoet gjelder også her: identifikatoren er engelsk, ordet vi sier til
hverandre og til brukeren er norsk. Der begge finnes står den engelske nøkkelen i
parentes.

## Meldinger og innhold

**Melding** (`message`):
En børsmelding fra en utsteder, slik kilden publiserte den. Bærer alltid tittel,
selskap, tidspunkt, kildekategori og lenke til originalen.
_Unngå_: nyhet, artikkel, varsel, post

**Berikelse** (`enrichment`):
Alt en språkmodell har lagt til en melding: kategori, viktighet, klarspråk-sammendrag,
tall med sitat og fagordreferanser. En melding kan ha flere berikelser over tid, én per
gang den er kjørt.
_Unngå_: analyse, AI-svar, oppsummering

**Klarspråk-sammendrag** (`what_happened`):
De to setningene på norsk som forteller hva som har skjedd. Beskriver aldri hva leseren
bør gjøre.
_Unngå_: ingress, sammendraget, beskrivelse

**Viktighet** (`importance`):
Hvor mye meldingen betyr for en som eier aksjen: `important`, `good_to_know` eller
`noise`. Settes deterministisk av kildekategorien og kan bare beveges av modellen
innenfor det kategorien tillater.
_Unngå_: prioritet, alvorlighetsgrad, score, relevans

**Kildekategori** (`source_category`):
Kildens egen, regulatoriske inndeling av meldingen. Bærer viktighetsgulvet.
_Unngå_: type, meldingstype

**Produktkategori** (`category` på berikelsen):
Vår egen inndeling, valgt av modellen, som brukeren ser som etikett: emisjon, oppkjøp,
kvartalsrapport. Ikke det samme som kildekategorien.
_Unngå_: kategori uten presisering, tag, emne

**Fagord** (`term`):
Et begrep i ordlista, med én fast forklaring skrevet for noen som eier tre aksjer.
Nøkkelen er selve ordet på norsk. Modellen returnerer kun nøkler og skriver aldri en
forklaring selv.
_Unngå_: begrep i kode, glossary-entry, definisjon

**Ukjent fagord** (`unknown_term`):
Et ord modellen møtte uten treff i ordlista. Arbeidskøen for redaksjonelt påfyll, ikke
en feil.

**Tall** (`figure`):
En verdi hentet fra meldingen, alltid belagt med et ordrett sitat fra brødteksten.
Overlever ikke sitatet verifiseringen, forsvinner hele tallet.
_Unngå_: nøkkeltall, metrikk, beløp

**Korreksjon**:
En melding som retter en tidligere melding. Begge finnes, begge er lesbare, og de peker
på hverandre.
_Unngå_: erstatning, oppdatering, revidert melding

**Vedlegg** (`attachment`):
En fil publisert sammen med meldingen, typisk en kvartalsrapport. Lagres varig hos oss
fordi kilden kan rydde den bort.

## Selskaper

**Selskap** (`company`):
En utsteder notert på Oslo Børs, Euronext Expand eller Euronext Growth. Identifiseres av
kildens utstederidentifikator, ikke av tickeren, fordi tickere byttes.
_Unngå_: aksje, ticker, utsteder i brukervendt tekst

**Marked** (`market`):
Hvilken liste selskapet er notert på. Teknisk fakta, sjelden interessant for brukeren.

## Bruker og flate

**Bruker** (`user`):
En innlogget person. Identifiseres av e-postadressen sin. Ingen passord finnes.
_Unngå_: konto, kunde, abonnent

**Overvåkningsliste** (`watchlist`):
Selskapene brukeren har valgt å følge. Ikke en portefølje: den inneholder ingen antall,
ingen kostpris og ingen verdi.
_Unngå_: portefølje, favoritter, mine aksjer, følgeliste

**Onboarding**:
Førstegangsflyten der brukeren velger selskaper. Regnes som gjennomført én gang, og er
noe annet enn å ha selskaper i lista.

**Feed**:
Den innloggede strømmen av meldinger fra selskapene brukeren følger, nyeste først.
Viser viktig og greit å vite som standard, støy bak et filter.
_Unngå_: tidslinje, dashboard, nyhetsstrøm, forside

**Nytt siden sist**:
Alt publisert etter forrige gang brukeren så feeden. Ett tidspunkt per bruker, ikke lest
og ulest per melding.
_Unngå_: ulest, uleste varsler

**Lat berikelse**:
Berikelsen som utløses første gang noen åpner en gammel melding som aldri har vært
beriket. Koster et språkmodellkall, og er derfor begrenset per bruker per døgn.
_Unngå_: on-demand-oppsummering, just-in-time

**Degradert melding**:
En melding som er fullt lesbar med tittel, selskap, kategori, viktighet og lenke, men
uten klarspråk-sammendrag. En normal tilstand, ikke en feil.
_Unngå_: ufullstendig, feilet melding

## Drift

**Operatør**:
Den som drifter tjenesten. Har verktøy for omkjøring, stikkprøver og helse, bak en
hemmelighet, fordi de koster penger å kalle.
_Unngå_: admin, superbruker

**Stille feil**:
At kilden slutter å levere eller endrer form uten at noe krasjer. Den farligste
feiltypen i et varselprodukt, og grunnen til at hver kjøring registreres.
