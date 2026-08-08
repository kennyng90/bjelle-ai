# @bjelle/dashboard

Det innloggede produktet: børsvarsler og klarspråk-oppsummeringer.
TanStack Start med filbasert ruting.

```bash
pnpm --filter @bjelle/dashboard dev      # http://localhost:3000
pnpm --filter @bjelle/dashboard build
pnpm --filter @bjelle/dashboard start    # kjører produksjonsbygget
```

Ruter ligger i `src/routes/` og genererer `src/routeTree.gen.ts` automatisk.
Den filen er generert og skal ikke redigeres.

Styling kommer fra `@bjelle/tokens` og komponenter fra `@bjelle/ui`, begge koblet
inn via `src/styles.css`. Se rot-README for konvensjonene rundt det.
