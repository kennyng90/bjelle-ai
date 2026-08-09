import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// Testene kjører inne i workerd via Miniflare, med de samme bindingene som
// wrangler.jsonc deklarerer. Da er D1, R2 og køene ekte i testene, og en
// binding som mangler i konfigurasjonen feller testen i stedet for produksjon.
export default defineConfig({
	plugins: [
		cloudflareTest(async () => {
			// Migrasjonene er de samme filene som kjøres i produksjon. Et skjema
			// som bare finnes i testene beviser ingenting.
			const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));

			return {
				wrangler: { configPath: "./wrangler.jsonc" },
				miniflare: {
					bindings: {
						TEST_MIGRATIONS: migrations,
						// Hemmeligheten er stubbet. Utgående kall til Anthropic
						// fanges på nettverksgrensen, så verdien brukes aldri.
						ANTHROPIC_API_KEY: "test-nokkel",
					},
				},
			};
		}),
	],
	test: {
		setupFiles: ["./test/oppsett.ts"],
	},
});
