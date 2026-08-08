# @bjelle/ui - komponentbiblioteket

Denne fila er kontrakten for arbeid i `packages/ui`. Den slår generelle råd fra
storybook-, vitest-, accessibility- og performance-skillene der de er uenige.

## Miljø: verktøykjeden er Windows, ikke Linux

Shellet er WSL, men `node` er `C:\Repos\bjelle-ai\node_modules\.bin\node.exe` (win32),
lastet ned av pnpm via `devEngines.runtime`. Det finnes **ingen Linux-node på PATH**.

- Kjør alt gjennom `pnpm` eller `pnpm exec`. Bare `node`, `npx` eller `tsx` feiler med
  `command not found`.
- Den globale `playwright-cli` på PATH er en Windows-npm-shim og kræsjer i WSL med
  `exec: node: not found`. Bruk `pnpm exec playwright ...` i stedet.
- Playwright-browsere ligger i Windows-cachen (`C:\Users\Kenny\AppData\Local\ms-playwright`).

## Hvor ting bor

| Hva | Hvor |
| --- | --- |
| Komponenter og stories | `packages/ui/src/<komponent>/` |
| Storybook-instans og testoppsett | `apps/designsystem/` |
| Designtokens | `packages/tokens/theme.css` |

`packages/ui` har ikke noe byggesteg. Appene importerer TypeScript-kilden direkte.

## Kommandoer

```bash
pnpm --filter @bjelle/designsystem dev         # Storybook på 6006
pnpm --filter @bjelle/designsystem test        # alle stories som tester i Chromium
pnpm --filter @bjelle/designsystem test:watch
pnpm check                                     # Biome lint + format
pnpm typecheck
```

## Stories

- Én `*.stories.tsx` ved siden av hver komponent. Uten den finnes ikke komponenten
  i designsystemet.
- Importer typer fra `@storybook/react-vite`, **ikke** `@storybook/react`. Den generiske
  storybook-skillen sier `@storybook/react`; den tar feil for dette repoet.
- **All kode er på engelsk.** Det gjelder story-titler, story-eksportnavn og hver
  eneste lokale `const`, funksjon og hjelpekomponent - også de som bare finnes
  inni en story. `title: "Components/Button"`, `export const Sizes`,
  `const focusRing = ...`.
- Titlene har to røtter: `Primitives/*` for tokensidene i `foundations/`, og
  `Components/*` for alt annet. Rekkefølgen i sidemenyen styres av `storySort` i
  `apps/designsystem/.storybook/preview.tsx` og må oppdateres hvis en rot endres.
- Eksportnavnet er story-navnet. Trenger du ikke en annen etikett enn den
  Storybook utleder (`WithSupportingText` → "With Supporting Text"), skal
  `name:` ikke stå der i det hele tatt. Bruk den kun når den utledede formen
  blir feil, og skriv den da på engelsk.
- Grunnstoryen heter `Default`, ikke `Standard`.
- **Kommentarer, JSDoc og demo-innhold er på norsk.** Doc-kommentaren over `meta`
  blir beskrivelsen på autodocs-siden, og produktet er norsk. Args, JSX-tekst og
  strengene i `getByRole(..., { name: "..." })` er innhold, ikke kode - de skal
  vise ekte ordlengder og æøå.
- `tags: ["autodocs"]` gir dokumentasjonssiden. Det finnes ingen `.mdx`-filer, og
  `main.ts` matcher dem ikke lenger. Legg globben tilbake hvis MDX-docs skal innføres.
- Skjul arvede DOM-props som designeren ikke skal skru på:
  `argTypes: { type: { table: { disable: true } } }`.

## Test og a11y

Hver story kjøres som en test i ekte Chromium via `@storybook/addon-vitest`.
`a11y: { test: "error" }` i `apps/designsystem/.storybook/preview.ts` gjør at
axe-brudd **feiler bygget**, ikke bare fyller et panel.

**`apps/designsystem/vite.config.ts` må forbli den eneste configen.** Legges test-blokka
i en egen `vitest.config.ts`, vinner den fila over `vite.config.ts`, `tailwindcss()`
faller ut, og komponentene rendres helt ustilt. Testene blir da grønne uten å dekke
noe: enhver kontrastsjekk består trivielt fordi det ikke finnes farger å måle.
Dette har skjedd én gang. Ikke gjenta det.

Sanity-sjekk hvis du er i tvil om Tailwind er aktivt i testene:

```ts
play: async ({ canvas }) => {
  const bg = getComputedStyle(canvas.getByRole("button")).backgroundColor;
  expect(bg).not.toBe("rgba(0, 0, 0, 0)"); // ustilt = Tailwind mangler
}
```

Axe leser `oklch()` fint, så kontrastbrudd i designtokens fanges. Vær klar over at
Tailwind-klasser med lik spesifisitet avgjøres av rekkefølgen i stilarket, ikke av
rekkefølgen i `className`. En `className`-override av `text-*` slår ikke nødvendigvis
gjennom.

## Dekning (coverage)

`@vitest/coverage-v8` er installert fordi Storybooks testpanel i nettleseren
ikke starter uten den - uten pakka får du `Failed to initialize Vitest` /
`Cannot find package '@vitest/coverage-v8'`. CLI-kjøringen (`pnpm test`) er
upåvirket og trenger den ikke.

**Rapporten er foreløpig verdiløs, og det er ikke konfigurert bort.** Den måler
bare `apps/designsystem` sine egne filer (`preview.tsx`) og viser 100 %.
Komponentene ligger i `packages/ui`, altså utenfor Vite-roten, og v8 i
browser-modus attribuerer dem ikke dit. Prøvd uten hell:

- `coverage.include` med `../../packages/ui/src/**`
- `coverage.root` satt til monorepo-roten
- glob med `**/`-prefiks
- absolutt sti med skråstrek (Windows-baklengsskråstrek var ikke årsaken)

Alle fire ga `All files 0 %` uten feilmelding. Ikke stol på tallet, og ikke sett
en terskel på det før noen får det til å måle riktig pakke. Dekning sier uansett
lite her: hver story *er* en test, så dekningen følger av at komponenten har
stories i det hele tatt.

## Styling

Designsystemet er portert fra Practical UI. Tokenene ligger i tre lag i
`packages/tokens/theme.css`:

1. **Primitiver** - rå farger (`--blue-light-1000`, `--grey-solid-50`).
   Aldri brukt direkte i komponentkode.
2. **Roller** - semantiske navn (`--fill-brand-strong`, `--text-weak`,
   `--stroke-focus`). Ligger i vanlig `:root`, ikke i `@theme`, nettopp fordi
   `:root[data-theme="dark"]` må kunne bytte dem.
3. **`@theme inline`** - eksponerer rollene som Tailwind-utilities.

`inline` er ikke pynt. Uten det peker utilityen på en `--color-*`-variabel
Tailwind skriver én gang i `:root`, og temabyttet når aldri fram. Med `inline`
skriver utilityen `var(--rolle)` rett ut, og ett bytte på `<html>` snur alt.

- **Tailwinds standardpalett er slått av** (`--color-*: initial`). `bg-red-500`
  og `text-slate-700` finnes ikke og gir ingen stil. Det er med vilje: to
  fargesystemer der bare det ene snur i mørkt tema er verre enn ingen.
  Standard `--text-*` og `--radius-*` er også nullstilt - `text-xl` og
  `rounded-lg` finnes ikke.
- Klassenavnene dobler opp prefikset: `text-text-strong`, `bg-fill-weak`,
  `border-stroke-weak`. Det ser rart ut, men navnene er identiske med Figma-
  tokenene, så `text-weak` i designfila er greppbar som `text-text-weak` i koden.
- `text-text-on-strong` er tekst oppå en fylt statusflate. Bruk den, ikke hvit:
  fylte flater er lyse i mørkt tema, og hardkodet `#fff` gir da 1.4:1.
- Typerampen setter størrelse, linjehøyde og sperring i ett. `text-h2` er alt du
  trenger - ikke legg på `leading-*` eller `tracking-*` i tillegg.
- `font-strong` er 600, ikke 700. Practical UI bruker Semi Bold på overskrifter.
- Spacing er 4px-rutenettet, som er Tailwinds standard. `p-6` = 24px.
- Radius er navngitt etter piksler: `rounded-8` for kontroller, `rounded-12`
  eller `rounded-16` for kort, `rounded-full` for piller og avatarer.
- **To roller ligger rett på gulvet. Velg riktig av dem:**
  - `stroke-weak` er 1.23:1. Den er dekor - skillelinjer og korthårstrek. Er
    kanten det eneste som viser hvor en kontroll begynner og slutter, bruk
    `stroke-strong` (3.06:1). Skjemafeltene gjør dette riktig; kopier dem.
  - `icon-neutral` er 3.06:1, altså 0.06 over kravet i WCAG 1.4.11. Greit for
    ikoner ved siden av tekst. Bærer ikonet meningen alene - sammenslått
    sidemeny, ikonknapp uten etikett - bruk `icon-strong`.
  - `text-disabled` er 3.06:1 og når ikke 4.5. Kun på noe som faktisk er
    `disabled`, der WCAG 1.4.3 gir unntak. Aldri som dempet brødtekst; til det
    finnes `text-weak` (6.27:1).
- Interaktive elementer trenger synlig fokusring:
  `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus`.
- `transition-*` treffer allerede 180ms og `cubic-bezier(.4,0,.2,1)`. Ingen
  bounce, ingen uendelig dekorativ animasjon.

Konsistensen i tokenfila kan sjekkes maskinelt: hver rolle skal ha en
motpart i mørkt tema, og ingen `var()` skal peke på noe udefinert.

## Ikoner

`Icon` wrapper lucide-react. `IconName` er utledet fra biblioteket, så en
skrivefeil blir en typefeil. Ikoner er dekorative og `aria-hidden` som standard.
Bærer ikonet mening ingen nærliggende tekst dekker, gi det `label` - da blir det
`role="img"` med `aria-label`.

Practical UI bruker Feather. Lucide er det vedlikeholdte supersettet med samme
navn og geometri, men navnene er ikke alltid ett-til-ett. Lucide har både
`Loader` (Feathers åtte eiker), `LoaderCircle` (én bue) og `LoaderPinwheel`.
Practical UIs spinner er `Loader`. Slå opp i
`node_modules/.pnpm/lucide-react@*/node_modules/lucide-react/dist/esm/icons/`
når du er i tvil - filnavnet er kebab-case av ikonnavnet.

## Temaer

Lyst tema er standard. Mørkt tema slås på med `data-theme="dark"` på
`<html>` (eller klassen `.dark`). I Storybook ligger bryteren i verktøylinja.

Attributtet må stå på `<html>`, ikke på en wrapper rundt innholdet: native
`<dialog>` og `::backdrop` rendres i topplaget, utenfor enhver wrapper, og
ville ellers beholdt lyst tema.

## Avhengigheter

Delte versjoner går i `catalog`-blokka i `pnpm-workspace.yaml` og refereres som
`"react": "catalog:"`. Nye pakker med byggeskript må inn i `allowBuilds` før de kjører.

## Kjente avvik i de vendede skillene

- **vitest-skillen** er generert mot 5.x beta. Repoet kjører 4.1.10. Sjekk API mot
  installert versjon før du foreslår noe.
- **performance-skillen** handler om TTFB, LCP og sidevekt. Det meste er irrelevant for
  et komponentbibliotek. Relevant delmengde her: unødvendige re-renders, CSS-vekt,
  og at komponenter ikke drar inn tunge avhengigheter.
