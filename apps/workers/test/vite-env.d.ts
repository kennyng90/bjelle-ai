// Fixtures leses med Vites ?raw-import slik at stubben serverer nøyaktig de
// bytene som ligger i repoet. Går de gjennom JSON.parse først, tester vi vår
// egen serialisering i stedet for kildens format.
declare module "*?raw" {
	const innhold: string;
	export default innhold;
}

// Vites egne typer drar inn DOM-miljøet, som ikke hører hjemme i en worker.
// Vi trenger bare den ene formen vi faktisk bruker.
interface ImportMeta {
	glob(
		pattern: string,
		options: { query: string; import: string; eager: true },
	): Record<string, string>;
}
