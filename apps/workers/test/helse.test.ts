import { exports } from "cloudflare:workers";
import { expect, it } from "vitest";

// Den billigste sjekken på at sømmen faktisk står: workeren bygges, kjøres i
// workerd, og svarer gjennom sitt ekte fetch-inngangspunkt.
it("svarer på helsesjekk", async () => {
	const svar = await exports.default.fetch("https://bjelle.test/health");

	expect(svar.status).toBe(200);
	expect(await svar.json()).toEqual({ status: "ok" });
});
