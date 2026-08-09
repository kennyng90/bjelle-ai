# Newsweb-fixtures

Ekte payloader, hentet fra `api3.oslo.oslobors.no` i august 2026. De ligger her fordi en
test som bruker en payload vi har funnet på, tester vår egen fantasi. Kilden formaterer
tall med hardt mellomrom, blander norsk og engelsk i samme kategori, og sender
korreksjoner som peker begge veier. Ingenting av det ville vi gjettet riktig.

## Filene

- `liste.json` - svaret fra `/newsreader/list`. Konvolutten er ekte og hvert element er
  ekte, men `data.messages` er redusert til de meldingene det finnes en fullstendig
  payload for. Ellers ville fila vært en halv megabyte uten å dekke mer.
- `melding/<id>-<kategori>.json` - svaret fra `/newsreader/message?messageId=<id>`,
  urørt. Filnavnet er dokumentasjon; stubben leser identifikatoren foran bindestreken.

## Hva utvalget dekker

Minst én melding per kildekategori kilden faktisk brukte i løpet av tolv måneder, samt:

| Tilfelle | Melding |
| --- | --- |
| Engelsk brødtekst | `679273`, `679272` og de fleste andre |
| Norsk brødtekst | `679262` (renteregulering), `679228` |
| Vedlegg | `679270` (to stykker), `678947`, `678914` |
| Korreksjonspar | `678914` rettet av `678947`, `678889` rettet av `678895` |
| Hardt mellomrom i tall | `679024` (`NOK 1000 million`), `679272`, `679270` |
| Tankestrek i brødteksten | `679266`, `679228` |
| Euronext Growth | `679234`, `679229`, `678475` (MERK) |
| Uten marked i det hele tatt | `679020`, `678849`, `677210` |

## Å hente flere

Kilden er åpen og svarer på GET. Vær høflig: én forespørsel i sekundet holder.

```sh
curl "https://api3.oslo.oslobors.no/v1/newsreader/message?messageId=679228"
```

Lista er dagsgranulær - et klokkeslett i `fromDate` avvises - og kapper på 600 treff.
Blir den kappet, står `data.overflow` på `true`. Det er derfor `Listing.truncated`
finnes: uten den mister en backfill meldinger i det stille.
