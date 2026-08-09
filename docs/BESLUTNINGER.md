# Beslutninger for Bjelle v1

Resultat av gjennomgang aug 2026. Utfyller [CONCEPT.md](CONCEPT.md), som beskriver
hvorfor. Dette dokumentet beskriver hva vi faktisk bygger, og hva vi bevisst lar være.

## Rammer

- Seriøs solo-bedrift, 10-20 timer i uka. Mål: betalende kunder innen 6-12 måneder.
- Tåler reelle driftskostnader (domener, LLM, e-post), men ikke børslisenser.

## Produkt

| Beslutning | Valg | Fravalgt |
| --- | --- | --- |
| Første flate | Innlogget dashboard | Offentlig feed, rent nyhetsbrev |
| V1-innhold | Overvåkningsliste, klarspråk-feed, viktighetsmerking, kurs | Portefølje med antall og kostpris |
| Dekning | Hele Oslo Børs: hovedliste, Expand, Growth (~350) | OBX 25, kun hovedliste |
| Varselkanal | Kun e-post | Web push, Discord |
| Varselrytme | Viktig umiddelbart, greit å vite i daglig digest kl 17, støy kun i feed | |
| Kvartalsrapporter | Ikke i v1. Vedlegg lagres i R2 og lenkes | Full PDF-analyse |
| Betaling | Ingen i v1. Gratis beta, ubegrenset, tydelig merket | Stripe fra dag én |

Prisnivå settes etter beta, basert på hva folk faktisk bruker. Rapportanalyse er
den planlagte første premium-funksjonen.

## Datakilder

- **Newsweb**: bygges nå, uten å spørre Euronext først. Poller bak et `Kilde`-interface
  slik at den kan byttes ut på uker. Vi publiserer sammendrag og lenke til originalen,
  aldri full rådatatekst.
- **Kurser**: Yahoo Finance (.OL), som i konseptet. Uoffisielt og skjørt, derfor:
  isolert bak samme kilde-interface, aggressivt cachet, og feeden må rendre komplett
  uten kurs. Kursfeil skal aldri kunne blanke en side.
- **Shortregisteret og Finanstilsynet**: åpne API-er, tas inn når feeden står.

## AI

- **Modell**: Claude Sonnet. Ett kall per melding som fyller hele skjemaet:
  kategori, viktighet, sammendrag, begrepsreferanser.
- **Skjemastyrt utdata, ikke fri prosa.** Skjemaet har ingen felter for vurdering,
  framtidsutsikt eller kurspåvirkning. Da kan modellen ikke gi råd, fordi det ikke
  finnes et sted å skrive det.
- **Publiseres automatisk.** Ingen manuell godkjenning. Stikkprøveverktøy for
  sammenligning mot original.
- **Tall må belegges med ordrett sitat.** Koden verifiserer at sitatet finnes i
  kildeteksten før publisering. Mangler det, fjernes tallet. Andelen forkastede tall
  logges som kvalitetsmål på prompten.
- **Ordforklaringer hentes fra kurert ordliste** i repoet, ca 100 begreper skrevet én
  gang og godt. Modellen returnerer kun referanser, aldri egen forklaring. Ukjente
  begreper havner i en kø som fylles på manuelt.
- **Modellversjon og prompt-hash lagres på hver rad**, slik at alt kan kjøres om.

### Viktighetsgrad

Deterministisk gulv per kategori, LLM-skjønn over det.

- Alltid viktig: emisjon, oppkjøp og bud, resultatvarsel, suspensjon, konkursvarsel,
  endring i toppledelse eller styre.
- Alltid støy: tekniske børsmeldinger, flagging under terskel, egne aksjer-transaksjoner.
- Alt annet: modellen vurderer.

Gulvet er dekket av vanlige enhetstester. Modellen kan aldri nedgradere en emisjon.

## Arkitektur

- **Alt på Cloudflare**: Workers, Cron Triggers, Queues, D1, R2.
- **Køen er ikke valgfri.** Den skiller oppdagelse fra berikelse fra utsending, slik at
  et LLM-timeout ikke mister en melding.
- **Feilmodus: varsle rått, berik etterpå.** Pollingen lagrer meldingen og setter
  viktighet fra kategoritabellen uten å vente på modellen. Er den viktig, går varselet
  ut umiddelbart med tittel, selskap og lenke, merket med at sammendrag kommer.
  Datamodell og UI må tåle at et sammendrag mangler.
- **Innlogging**: better-auth mot D1, magisk lenke på e-post, ingen passord. Lange
  sesjoner. Google kan legges til senere.
- **E-post**: Resend, med `auth.bjelle.ai` og `varsel.bjelle.ai` som separate
  avsenderdomener med hver sin DKIM. Spam-klager på digester skal ikke kunne drepe
  innloggingslenkene.
- **Historikk**: backfill 12 måneder rådata ved oppstart. AI-sammendrag på de siste 3
  månedene i batch, eldre meldinger oppsummeres første gang de åpnes. Backfillen er
  også evalueringssettet for prompt og viktighetsregler.

## Suksesskriterium

Uke 6-retensjon, terskel 30 %: andelen registrerte som fortsatt logger inn eller åpner
et varsel i uke 6. Under terskelen endrer vi produktform, ikke UI.

Sekundært: klikkrate på umiddelbare varsler mot daglig digest. Vinner digesten klart,
er premisset om at nybegynnere vil ha hastighet feil, og produktet skal roes ned til
en ukentlig oppsummering.

## Byggerekkefølge

1. Kilde-interface, Newsweb-poller, D1-skjema, R2 for vedlegg, backfill 12 mnd.
2. Kategoritabell og viktighetsregler, med tester. Kjøres mot backfillen.
3. Berikelse i kø: LLM-skjema, sitatverifisering, ordliste.
4. Auth og onboarding: magisk lenke, velg selskaper.
5. Dashboard-feed med kurs. Kurs er degraderbar.
6. Varsler: umiddelbar og digest, via Resend.
7. Landingsside i Astro, og måling for uke 6-retensjon.

## Åpne punkter

- Sikre bjelle.ai og bjelle.com. Sjekk Patentstyret før logo og profil. Tidskritisk.
- Selskapsform, MVA og Stripe. Parallelt spor, blokkerer ikke v1, men blokkerer inntekt.
- Personvernerklæring og datalokasjon. D1 bør ha EU-hint før første ekte bruker.
- Overvåking av Newsweb-formatendringer og Yahoo-brudd. Stille feil er verste sorten
  for et varselprodukt: pollingen må varsle deg når den finner uventet form eller
  null meldinger over tid.
