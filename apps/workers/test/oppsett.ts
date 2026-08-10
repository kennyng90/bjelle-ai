import { applyD1Migrations, reset } from "cloudflare:test";
import { env } from "cloudflare:workers";
import type { D1Migration } from "@cloudflare/vitest-pool-workers";
import { beforeEach } from "vitest";

// TEST_MIGRATIONS er en testbinding fra vitest.config.ts, ikke en produksjonsbinding.
// Derfor kastes den her i stedet for å utvide Env og lekke inn i src.
const migrations = (env as unknown as { TEST_MIGRATIONS: D1Migration[] }).TEST_MIGRATIONS;

// Pool-workers isolerer lagring per testfil, ikke per test. To tester i samme
// fil ville altså delt database og bøtte, og en test som lagrer en melding ville
// gjort neste test til en dublett-test uten å si fra. Vi nullstiller selv.
//
// Migrasjonene er de samme filene som kjøres i produksjon. Et skjema som bare
// finnes i testene beviser ingenting.
beforeEach(async () => {
	await reset();
	await applyD1Migrations(env.DB, migrations);
});
