# Bjelle

AI-overvåkning av Oslo Børs for nybegynnere. Se [docs/CONCEPT.md](docs/CONCEPT.md) for produktkonseptet.

pnpm workspace med fire apper og fire delte pakker. Én lockfile, én versjon av hver
delte avhengighet (pnpm catalog), felles Biome- og TypeScript-config.

## Struktur

| Prosjekt | Hva | Stack |
| --- | --- | --- |
| `apps/dashboard` | Innlogget produkt | TanStack Start, port 3000 |
| `apps/web` | Landingsside | Astro, port 3001 |
| `apps/designsystem` | Dokumentasjon av `@bjelle/ui` | Storybook, port 6006 |
| `apps/workers` | Newsweb-polling, varsler | Cloudflare Workers, port 8787 |
| `packages/ui` | Felleskomponenter | React, kildekode uten byggesteg |
| `packages/tokens` | Farger, typografi, radius | Tailwind v4 `@theme` |
| `packages/tsconfig` | TS-presets | `base` / `react-lib` / `react-app` / `worker` |
| `packages/biome-config` | Lint- og formatpresets | `base` / `react` |

## Kom i gang

```bash
pnpm install       # laster også ned Node 24 (devEngines.runtime)
pnpm dev           # alle apper parallelt
pnpm build         # alle apper
pnpm check         # Biome lint + format på hele repoet
pnpm typecheck     # tsc / astro check i alle prosjekter
```

Én app om gangen:

```bash
pnpm --filter @bjelle/dashboard dev
pnpm --filter @bjelle/workers dev
```

## CI

`.github/workflows/ci.yml` kjører på hver push til `main` og hver pull request, i fire
parallelle jobber:

| Jobb | Kommando | Hva den vokter |
| --- | --- | --- |
| Lint og typer | `pnpm check`, `pnpm typecheck` | Biome og TypeScript i alle prosjekter |
| Bygg | `pnpm build` | At alle fire apper bygger |
| Komponenttester | `pnpm --filter @bjelle/designsystem test` | Hver story i `@bjelle/ui`, montert i chromium, med axe-sjekk |
| E2E | `pnpm test:e2e` | Button gjennom SSR og hydrering i både web og dashboard |

Komponenttestene er Storybooks egne: `@storybook/addon-vitest` gjør hver story til en
test, spiller av `play`-funksjonen og kjører `addon-a11y` med `test: "error"`. Samme
kommando lokalt, uten filteret: `pnpm --filter @bjelle/designsystem test`.

Skjermbildetestene (`pnpm test:visuell`) er utenfor CI. Baselinene i repoet er tatt på
Windows, og Linux rasteriserer fonter annerledes - de må genereres på nytt i CI før
prosjektet kan slås på der.

## Konvensjoner

- **Delte versjoner går i `catalog:`.** Legg nye felles avhengigheter i `catalog`-blokken
  i `pnpm-workspace.yaml` og referer dem som `"react": "catalog:"`. Da kan ikke to apper
  ende på hver sin React.
- **All pnpm-konfigurasjon bor i `pnpm-workspace.yaml`** (camelCase). pnpm 11 leser
  ikke lenger `pnpm`-feltet i `package.json`, og `.npmrc` er kun for auth-tokens.
- **Nye avhengigheter med byggeskript må godkjennes** i `allowBuilds` før de får kjøre.
- **`packages/ui` bygges ikke.** Appene konsumerer TypeScript-kilden direkte. Nye
  komponenter trenger en `*.stories.tsx` ved siden av seg for å dukke opp i designsystemet.
- **Tailwind må få vite om `packages/ui`.** Det skjer via `@import "@bjelle/ui/styles.css"`.
  Uten den blir komponentene rendret uten styling, siden Tailwind hopper over
  `node_modules`. Se kommentaren i `packages/ui/styles.css`.
