---
name: cloudflare-docs
description: Slå opp gjeldende Cloudflare-dokumentasjon som markdown, uten å dra store indekser inn i konteksten. Bruk når du trenger en grense, en API-signatur, en binding-form, et konfigurasjonsfelt eller en wrangler-kommando - og alltid før du siterer et tall om Workers, D1, R2, Queues eller Cron Triggers.
---

# Cloudflare-dokumentasjon

Pretrent kunnskap om Cloudflare er utdatert. Grenser, prissetting, typesignaturer og
konfigurasjonsfelter endrer seg, og både `cloudflare`- og `workers-best-practices`-skillen
sier eksplisitt at dokumentasjonen slår modellens hukommelse. Denne skillen er hvordan du
henter den billig.

## Bruk skriptet, ikke WebFetch

```bash
.claude/skills/cloudflare-docs/cf-docs.sh search <produkt> <søkeord...>
.claude/skills/cloudflare-docs/cf-docs.sh read <url>
```

Typisk oppslag, to kall:

```bash
$ cf-docs.sh search queues dead letter
[Dead Letter Queues](https://developers.cloudflare.com/queues/configuration/dead-letter-queues/index.md): Route failed messages to a Dead Letter Queue after exceeding the retry limit.

$ cf-docs.sh read https://developers.cloudflare.com/queues/configuration/dead-letter-queues/
```

Kjenner du ikke produktnavnet i URL-en:

```bash
cf-docs.sh products vitest      # → workers
cf-docs.sh products             # hele produktlista
```

## Hvorfor ikke bare hente sidene selv

Tre feller skriptet allerede er på andre siden av:

1. **Indeksene er store.** `workers/llms.txt` er 82 KB, `r2/llms.txt` 15 KB.
   Skriptet greper dem lokalt og cacher dem et døgn i `$TMPDIR`, så du ser bare
   treffene. Henter du dem med WebFetch, betaler du hele vekten hver gang.
2. **HTML-versjonen er nær hundre ganger så stor.** Samme side: 3 KB markdown mot
   220 KB HTML.
3. **`index.md`-trikset knekker på flyttede sider.** En utdatert sti svarer 301 og
   mister `.md`-suffikset, så du lander i HTML. Skriptet sender
   `Accept: text/markdown` i stedet, og den overlever redirecten.

## Grensene

Skriptet snakker kun med `developers.cloudflare.com`. Andre verter avvises.

`llms-full.txt` finnes per produkt, men `/workers/llms-full.txt` er 4,5 MB. Ikke hent den,
verken med skriptet eller uten.

For pakkeversjoner og kompatibilitet er dokumentasjonen feil verktøy. `npm view <pakke>
versions --json` og `npm view <pakke> peerDependencies` er eksakte.
