import { expect, test } from "@playwright/test";

// Kjøres i begge prosjekter (web og dashboard). Poenget er ikke å teste Button -
// den er dekket av stories i apps/designsystem. Poenget er at komponenten
// overlever turen gjennom hver app sin egen SSR- og hydreringsmodell.

test("Button rendrer med designtokens og uten hydreringsfeil", async ({ page }) => {
	const konsollfeil: string[] = [];
	page.on("console", (melding) => {
		if (melding.type() === "error") konsollfeil.push(melding.text());
	});
	page.on("pageerror", (feil) => konsollfeil.push(feil.message));

	await page.goto("/");

	const knapp = page.getByRole("button").first();
	await expect(knapp).toBeVisible();

	// Tilgjengelig navn. En knapp uten navn er usynlig for skjermleser.
	await expect(knapp).not.toHaveAccessibleName("");

	// Tailwind-kjeden går via @bjelle/ui/styles.css i hver app sin CSS-rot.
	// Ryker den, rendres komponenten ustilt og bakgrunnen blir gjennomsiktig.
	const bakgrunn = await knapp.evaluate((el) => getComputedStyle(el).backgroundColor);
	expect(bakgrunn).not.toBe("rgba(0, 0, 0, 0)");

	// At fargen er en token-farge, ikke en tilfeldig hex noen skrev inn.
	//
	// Tidligere sto det `toMatch(/^oklch\(/)` her, fordi de gamle tokenene var
	// oklch. Etter porten til Practical UI er de rgb, og da sier formatet
	// ingenting: nettleseren regner også `#4C64D9` om til `rgb(...)`. Sjekken
	// måtte derfor bli en sammenligning mot selve rollen.
	const rolle = await page.evaluate(() =>
		getComputedStyle(document.documentElement).getPropertyValue("--fill-brand-strong").trim(),
	);
	expect(rolle).not.toBe("");
	expect(bakgrunn.replace(/\s/g, "")).toBe(rolle.replace(/\s/g, ""));

	// React må ha hydrert knappen. En hydrert DOM-node får en __reactFiber$-nøkkel;
	// ren SSR-markup har den ikke. Dette er sjekken som avslører en Astro-øy uten
	// client:*-direktiv: da rendres knappen pent, ser helt riktig ut, og er død.
	// Ingen konsollfeil, ingen visuell forskjell, ingenting som skriker.
	await expect
		.poll(
			() => knapp.evaluate((el) => Object.keys(el).some((n) => n.startsWith("__reactFiber$"))),
			{ message: "knappen ble aldri hydrert av React" },
		)
		.toBe(true);

	// Hydreringsavvik mellom server og klient dukker opp som konsollfeil.
	expect(konsollfeil).toEqual([]);
});

test("Button har synlig fokusring ved tastaturnavigasjon", async ({ page }) => {
	await page.goto("/");

	await page.keyboard.press("Tab");

	const fokusert = page.locator(":focus-visible");
	await expect(fokusert).toHaveRole("button");

	const ring = await fokusert.evaluate((el) => {
		const stil = getComputedStyle(el);
		return { bredde: Number.parseFloat(stil.outlineWidth), stil: stil.outlineStyle };
	});
	expect(ring.stil).not.toBe("none");
	expect(ring.bredde).toBeGreaterThan(0);
});
