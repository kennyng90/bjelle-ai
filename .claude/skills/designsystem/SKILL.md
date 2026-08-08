---
name: designsystem
description: Arbeidsflyt for komponenter i @bjelle/ui og Storybook-instansen i apps/designsystem. Bruk når en komponent skal lages, endres, dokumenteres, testes eller a11y-gjennomgås - eller når brukeren sier designsystem, komponent, story eller Storybook.
---

# Designsystem-arbeidsflyt

Prosjekt-skill for `packages/ui` + `apps/designsystem`. Den styrer **rekkefølgen** og
avgjør **når** de vendede skillene (storybook, accessibility, vitest, playwright-cli,
performance) skal lastes. Ikke last dem alle på forhånd: til sammen er de titusenvis
av tokens generisk råd som drukner det som gjelder her.

## Steg 0 - alltid

Les `packages/ui/CLAUDE.md`. Den er kontrakten og slår de generiske skillene ved
uenighet. Særlig: verktøykjeden er Windows under WSL, så alt går via `pnpm exec`.

## Steg 1 - komponent og story

Skriv eller endre komponenten i `packages/ui/src/<komponent>/`, med en
`*.stories.tsx` ved siden av. Uten story finnes ikke komponenten i designsystemet.

Last `storybook`-skillen **kun** hvis du står fast på story-struktur, argTypes,
decorators eller docs-oppsett. For en vanlig variant-story er `Button.stories.tsx`
det bedre forbildet: den viser husets konvensjoner (norske titler,
`@storybook/react-vite`, skjulte DOM-props).

## Steg 2 - kjør testene

```bash
pnpm --filter @bjelle/designsystem test
```

Hver story kjøres som en test i ekte Chromium, og axe-brudd feiler kjøringen.
Grønt her betyr at komponenten rendrer, at interaksjoner virker og at den er
a11y-ren. Rødt leses slik:

| Feil | Hva du gjør |
| --- | --- |
| `color-contrast` | Bytt token, ikke terskelen. Last `accessibility` for regelen |
| `button-name`, `label`, `aria-*` | Semantikkfeil i komponenten. Last `accessibility` |
| Feil i `play` | Interaksjonslogikk. Last `vitest` bare hvis du er usikker på API-et |
| Alt ustilt / `rgba(0, 0, 0, 0)` | Tailwind falt ut av testconfigen. Se `packages/ui/CLAUDE.md` |

Legg til en `play`-funksjon når komponenten har oppførsel (fokus, toggling,
tastaturnavigasjon). Statiske varianter trenger det ikke.

## Steg 3 - visuell verifikasjon

Testene fanger semantikk og kontrast, ikke om noe *ser* riktig ut. For nye komponenter
og visuelle endringer: start `pnpm --filter @bjelle/designsystem dev` og se på den.
Last `playwright-cli` når du trenger å drive nettleseren selv - og bruk
`pnpm exec playwright`, aldri den globale `playwright-cli` (knust i WSL).

Vær kresen: skjeve baselines, ujevn optisk spacing, fokusring som klippes av en
overflow-container. Fiks det du ser, også når det ikke var oppgaven.

## Steg 4 - hygiene

```bash
pnpm check && pnpm typecheck
pnpm test:e2e   # samme suite mot apps/web og apps/dashboard
```

Begge må være grønne før du sier deg ferdig.

## Ferdig når

- [ ] Komponenten har en `*.stories.tsx` som dekker hver variant og hver størrelse
- [ ] Deaktivert/tom/feil-tilstand har egen story der den finnes
- [ ] `pnpm --filter @bjelle/designsystem test` er grønn
- [ ] Kun designtokens i stilene, ingen rå fargeverdier
- [ ] Interaktive elementer har synlig fokusring og fungerer med tastatur
- [ ] `pnpm check`, `pnpm typecheck` og `pnpm test:e2e` er grønne

## Når du skal sende Bjarne i stedet

Bjarne er senior frontendutvikler og eier `@bjelle/ui`. Send ham hele oppgaven når det
gjelder en ny eller endret komponent: han jobber testdrevet, kjenner kompatibilitets-
kravene til `apps/web` og `apps/dashboard`, og verifiserer i begge appene før han er
ferdig. Denne skillen er for når du gjør arbeidet selv i hovedloopen.

## Når performance-skillen er relevant

Sjelden. Den handler om sidelast (TTFB, LCP, Early Hints) og gjelder `apps/web` og
`apps/dashboard`, ikke komponentbiblioteket. Last den her bare hvis spørsmålet
faktisk er re-renders, CSS-vekt eller en tung avhengighet som dras inn i bundelen.
