# Prototype: inntakspipelinen (issue #2)

**Kastbar.** Slettes eller foldes inn i `apps/workers` når spørsmålet under er besvart.
Ingen tester, ingen feilhåndtering utover det som gjør den kjørbar, ingen database.

Kjør: `pnpm prototype:inntak`

## Spørsmålet

Issue #2 fastsetter en tilstandsmaskin, et viktighetsgulv og en sitatverifisering på papiret.
Prototypen finnes for å presse dem gjennom tilfellene som er vanskelige å resonnere seg til:

1. **Holder løftet om hastighet når modellen er nede?** En melding skal være lesbar med
   tittel, selskap, kategori, viktighet og lenke selv om berikelsen aldri kommer.
   Kan en melding gå tapt, eller sette seg fast, mellom `lagret`, `i_kø`, `berikelse_feilet`
   og dødbrevkøen?
2. **Er gulvet riktig formet?** "Alltid viktig" er et gulv modellen kan heve fra, men
   "alltid støy" er i praksis et tak. Ukjent kategori skal aldri falle til støy.
   Føles det riktig når man ser modellen bli overkjørt begge veier?
3. **Er sitatverifiseringen på riktig granularitet?** Hele talloppføringen forkastes,
   ikke bare sitatet. Ser et sammendrag med hull ut som noe man tør publisere?
4. **Blir omkjøring med ny prompt målbar?** Historiske berikelsesrader beholdes, og
   forkastningsraten regnes per prompt-hash. Er det nok til å se om en promptendring hjalp?

## Hva som ligger hvor

- `pipeline.ts` - ren logikk. Tilstandsmaskin (`reduser`), kategoritabell (`klemViktighet`),
  sitatverifisering (`sitatFinnes`), avledede mål (forkastningsrate, kostnad, stille feil).
  Dette er delen som er verdt å løfte inn i den ekte koden hvis den holder.
- `fikstur.ts` - Newsweb og språkmodellen som ren data. Én melding per tilfelle spec-en
  krever: emisjon der modellen sier støy, teknisk melding der modellen sier viktig,
  engelsk kvartalsrapport med vedlegg og ett oppdiktet sitat, ukjent kildekategori,
  Growth-selskap, dublett i overlappsvinduet, korreksjon, hardt mellomrom i tall.
- `tui.ts` - kastbart skall. Ingen logikk.

## Tilfeller å kjøre

| Tastesekvens | Skal vise |
| --- | --- |
| `p k k k` | Emisjonen blir viktig selv om modellen sa støy (⚑). Teknisk melding blir støy selv om modellen sa viktig. Ett tall i kvartalsrapporten forkastes, resten publiseres. |
| `p p` | Samme melding i overlappsvinduet gir ikke ny rad. Ukjent kategori lander på greit å vite, ikke støy. |
| `p m m` | Modellen er nede. Meldingen er fortsatt lesbar, forsøkstelleren stiger. |
| `p m m m` | Tredje forsøk sender meldingen til dødbrevkøen. Den er fortsatt lesbar. |
| `p m r k` | Ny kø uten å hente meldingen fra kilden på nytt. |
| `b b b b` | Backfill går bakover måned for måned. Bare de tre siste månedene legges i kø. |
| `p k k k n o` | Omkjøring med ny prompt-hash. Berikelsestelleren stiger, gamle rader består, forkastningsraten regnes på gjeldende prompt. |
| `x` eller `s s s` | Alarmen for stille feil slår ut. |

## Svaret

_Fylles ut når prototypen er kjørt. Deretter slettes mappa, og beslutningen skrives inn i
issue #2 eller docs/BESLUTNINGER.md._

- Spørsmål 1:
- Spørsmål 2:
- Spørsmål 3:
- Spørsmål 4:

### Ting prototypen allerede har avdekket

- **"Alltid støy" er et tak, ikke et gulv.** Kategoritabellen i spec-en er beskrevet som
  et gulv, men `TEKNISK_MELDING` må klemme modellen nedover for å oppfylle brukerhistorie 5.
  Implementert som `{standard, min, maks}` per kategori. Verdt å avgjøre bevisst: skal
  modellen kunne heve en teknisk melding som faktisk er viktig?
- **Ukjent kategori trenger sitt eget gulv.** `{min: greit_a_vite, maks: viktig}`, ellers
  kan modellen dytte en kategori vi ikke kjenner ned i støy, stikk i strid med
  "En kategori vi ikke kjenner, skal være synlig".
- **Korreksjon er ikke en tilstand.** Den er en egen melding med peker bakover, og den
  korrigerte raden trenger en peker framover for at en feed skal kunne vise nyeste versjon.
  Ingen av de to pekerne står eksplisitt i datamodellen i issue #2.
- **Normalisering av hardt mellomrom er ikke valgfritt.** `NOK 450 000 000` i Newsweb-HTML
  bruker ` `. Uten normaliseringen forkastes et tall som faktisk står i meldingen,
  og forkastningsraten måler parseren i stedet for prompten.
