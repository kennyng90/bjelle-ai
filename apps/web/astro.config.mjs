import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
	site: "https://bjelle.ai",
	integrations: [react()],
	vite: {
		plugins: [tailwindcss()],
		optimizeDeps: {
			/*
			 * @bjelle/ui er en workspace-pakke, altså en symlink. Vite
			 * forhåndsbundler ikke avhengighetene til lenkede pakker, så
			 * lucide-react blir først oppdaget i det øyeblikket øya lastes.
			 * Optimizeren kjører da om igjen midt i forespørselen, og den som
			 * var i lufta svarer 504 "Outdated Optimize Dep".
			 *
			 * Det er kun et dev-problem - bygget er upåvirket - men det gir en
			 * konsollfeil ved første sidelast, og e2e-testen som vokter mot
			 * hydreringsfeil kan ikke skille den fra en ekte en.
			 *
			 * Skrivemåten "@bjelle/ui > lucide-react" er Vites egen for nettopp
			 * dette tilfellet. Bart "lucide-react" virker ikke: pnpm legger den
			 * i packages/ui/node_modules, ikke i appens eget tre, og Vite gir
			 * da "Failed to resolve dependency" og bundler ingenting.
			 */
			/*
			 * Astros egen dev-toolbar har nøyaktig samme problem, men av en annen
			 * grunn: den injiseres i siden etter at serveren har startet, så den
			 * er ikke med i skanningen ved oppstart. Første sidelast oppdager den,
			 * optimizeren kjører om igjen, og forespørselen etter entrypointet
			 * svarer 504. Verktøylinja er dev-pynt og påvirker ikke siden - men
			 * konsollfeilen er ikke til å skille fra en ekte, og e2e-testen som
			 * vokter mot hydreringsfeil feilet på den hver eneste kjøring.
			 */
			include: ["@bjelle/ui > lucide-react", "astro/runtime/client/dev-toolbar/entrypoint.js"],
		},
	},
});
