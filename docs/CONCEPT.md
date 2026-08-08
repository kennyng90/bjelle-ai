# Bjelle: AI-overvåkning Oslo Børs for nybegynnere (validert aug 2026)

## Navn: Bjelle
Valgt navn. Dobbel betydning: åpningsbjella på børsen + varselbjella i appen. Logo tegner seg selv.
Bonus: "bjelleku" = den som leder flokken, altså bellwether på børsspråk.
Vennlig lyd som passer nybegynnere, i motsetning til trader-tunge navn.

Domenestatus (DNS-sjekk aug 2026, må bekreftes hos registrar):
- bjelle.ai LEDIG (hovedvalg, signaliserer AI)
- bjelle.com LEDIG (sikre denne også)
- bjelle.io / .app / .co LEDIG
- bjelle.no TATT, parkert hos One.com (46.30.213.29). Ser ubrukt ut, kan forsøkes kjøpt

TODO: sjekk Patentstyret varemerkeregister før logo/profil.

Vurderte alternativer: Børstolken, Klarbørs, Børsvakt, Meldr (meldr.no/.ai/.io ledig), Norna, Hugin (hugin.no ledig, men Hugin ASA var historisk distributør av børsmeldinger, varemerkerisiko), Kvartal, Varsl.
Forbehold Bjelle: bj-lyden er tung utenfor Norden. Uproblematisk for Norge/Sverige/Danmark.

## Posisjonering: nybegynnervennlig
- Målgruppe: nye aksjonærer (flere hundre tusen i Norge etter 2020), ikke finansproffer
- Alle konkurrenter (TDN, Finansavisen, Euronext Live, Investtech) er for proffer. Nybegynnere underbetjent
- Kenny er selv nybegynner = er målgruppen. Egen forvirring er research
- Produktprinsipper:
  - Klarspråk-oppsummering av hver melding ("emisjon = de trykker nye aksjer, din andel vannes ut litt")
  - Innebygde ordforklaringer (trykk på begrep, få 2 setninger)
  - "Trenger jeg bry meg?"-merking: viktig / greit å vite / støy
  - Onboarding 30 sek: velg selskapene du eier
- Klarspråk-innhold er delbart = markedsføring i r/norskefinans, Facebook-aksjegrupper

## Datakilder

| Kilde | Tilgang | Status |
|---|---|---|
| Børsmeldinger (Newsweb) | React-SPA, intern JSON-backend. Ingen offisiell åpen API. Meldingene er lovpålagt offentlig info | Gul: teknisk mulig, sjekk vilkår |
| Shortregisteret (SSR) | ssr.finanstilsynet.no/api/v2, åpen API fra Finanstilsynet, JSON | Grønn |
| Finanstilsynet åpne data | api.finanstilsynet.no/registry, OAS 3.0 | Grønn |
| Innsidehandler (PDMR) | Kommer som egen meldingskategori i Newsweb | Gul (følger Newsweb) |
| Kvartalsrapporter | PDF-vedlegg i Newsweb + selskapenes IR-sider | Grønn |
| Kurser | Yahoo Finance (.OL-tickere) gratis/forsinket. Sanntid krever Euronext-lisens (dyrt) | Grønn for MVP med 15 min forsinkelse |
| Webcasts | Selskapenes IR-sider, ingen samlet kilde | Gul, manuelt/senere |

## Konklusjon
MVP teknisk mulig uten lisenskostnad: Newsweb-polling + SSR-API + Yahoo-kurser + LLM-oppsummering.

## Risiko
- Newsweb/Euronext-vilkår for videredistribusjon må sjekkes. Selve meldingene er offentlig lovpålagt informasjon
- Aldri gi kjøps-/salgsanbefalinger (konsesjonsplikt, Finanstilsynet)
- Sanntidskurser = dyr Euronext-lisens, unngå i start
- Nybegynnere kan churne mer enn nerder. Motvirkes med læringselement og vanebygging

## Forretningsmodell (justert for nybegynnersegment)
- Gratis: ukentlig AI-nyhetsbrev + shortvarsler (SSR åpen og gratis, klikkvennlig, vekstmotor) + 2-3 selskaper. Raust gratisnivå
- Premium 49-79 kr/mnd (senket fra 99-149 pga nybegynnersegment, lavere pris x større volum): alle selskaper, varsler innen minutter, AI-lesing av kvartalsrapporter i klarspråk
- Pro 299-499 kr/mnd for nerdene: senere, ikke i MVP
- B2B 5-20K kr/mnd: rådgivere, formuesforvaltere, IR. Selger innsikt/analyse, aldri rådata
- DROPPET: API-salg av datastrøm (Euronext-vilkårsrisiko). "Sekunder"-løfte nedgradert til "minutter" (daytradere er feil kunde)
- Prinsipp: selg innsikt, aldri rådata
- Lanseringstrapp: gratis nyhetsbrev bygger liste, så varsler, så premium

## Markedsregnestykke
600K+ aksjonærer i Norge. Eks: 2 000 betalende a 59 kr + 10 B2B a 10K = ~220K kr/mnd, solo, nær null kostnader.

## Neste steg
1. Sikre bjelle.ai + bjelle.com
2. Sjekk Patentstyret
3. Bygg prototyp: hent børsmelding, AI-oppsummer i klarspråk, formater varsel
