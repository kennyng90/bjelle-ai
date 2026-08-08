/*
 * Statisk server for storybook-static.
 *
 * Skrevet for hånd framfor å dra inn en pakke: dette er tretti linjer som
 * aldri endrer seg, og en serverpakke i forsyningskjeden for å levere filer
 * fra disk under test er ikke verdt bytteforholdet.
 *
 * Visuelle tester kjøres mot det bygde Storybook, ikke mot dev-serveren.
 * Dev-serveren kompilerer on demand, og da varierer tidspunktet en story er
 * ferdig tegnet fra kjøring til kjøring - det er nettopp den variasjonen som
 * gjør skjermbildetester ustabile.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROT = fileURLToPath(new URL("../../../apps/designsystem/storybook-static", import.meta.url));
/*
 * Porten kommer som argument, ikke som miljøvariabel. Kommandoen startes av
 * Playwright i et Windows-skall, der `PORT=x node ...` ikke er gyldig syntaks.
 */
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 6008);

const TYPER = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".png": "image/png",
	".jpg": "image/jpeg",
	".svg": "image/svg+xml",
	".woff2": "font/woff2",
	".woff": "font/woff",
	".ttf": "font/ttf",
	".map": "application/json; charset=utf-8",
};

if (!existsSync(join(ROT, "index.json"))) {
	console.error(`Fant ikke ${ROT}. Kjør "pnpm --filter @bjelle/designsystem build" først.`);
	process.exit(1);
}

createServer((req, res) => {
	// normalize + prefikssjekk hindrer ../-utbrudd fra en forespurt sti.
	const bane = decodeURIComponent((req.url ?? "/").split("?")[0]);
	let fil = normalize(join(ROT, bane === "/" ? "index.html" : bane));
	if (!fil.startsWith(ROT)) {
		res.writeHead(403).end("nei");
		return;
	}
	if (existsSync(fil) && statSync(fil).isDirectory()) fil = join(fil, "index.html");
	if (!existsSync(fil)) {
		res.writeHead(404).end("ikke funnet");
		return;
	}
	res.writeHead(200, {
		"content-type": TYPER[extname(fil)] ?? "application/octet-stream",
		// Ingen caching. Baselines skal sammenlignes mot det som nettopp ble
		// bygget, ikke mot noe nettleseren husker fra forrige kjøring.
		"cache-control": "no-store",
	});
	createReadStream(fil).pipe(res);
}).listen(PORT, () => console.log(`storybook-static på http://localhost:${PORT}`));
