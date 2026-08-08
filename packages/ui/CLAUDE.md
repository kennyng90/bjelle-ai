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
- Titler og story-navn er på norsk: `title: "Primitiver/Button"`, `name: "Størrelser"`.
  Bruk `name` når eksportnavnet ikke kan inneholde æøå.
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

## Styling

- Kun designtokens fra `packages/tokens/theme.css`. Ingen rå hex, rgb eller oklch i
  komponentkode.
- Tailwind når `packages/ui` via `@import "@bjelle/ui/styles.css"`. Uten den hopper
  Tailwind over `node_modules` og komponentene blir ustilt.
- Interaktive elementer trenger synlig fokusring:
  `focus-visible:outline-2 focus-visible:outline-offset-2`.

## Avhengigheter

Delte versjoner går i `catalog`-blokka i `pnpm-workspace.yaml` og refereres som
`"react": "catalog:"`. Nye pakker med byggeskript må inn i `allowBuilds` før de kjører.

## Kjente avvik i de vendede skillene

- **vitest-skillen** er generert mot 5.x beta. Repoet kjører 4.1.10. Sjekk API mot
  installert versjon før du foreslår noe.
- **performance-skillen** handler om TTFB, LCP og sidevekt. Det meste er irrelevant for
  et komponentbibliotek. Relevant delmengde her: unødvendige re-renders, CSS-vekt,
  og at komponenter ikke drar inn tunge avhengigheter.
