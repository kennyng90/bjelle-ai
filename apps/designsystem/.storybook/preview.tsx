import type { Decorator, Preview } from "@storybook/react-vite";
import { useEffect } from "react";
import { addons } from "storybook/preview-api";
import { DARK_MODE_EVENT_NAME } from "storybook-dark-mode";
import { darkTheme, lightTheme } from "./theme.ts";
import "./preview.css";

/*
 * Temaet bor på `<html>` som `data-theme`, ikke på en wrapper rundt storyen.
 *
 * Tokenene i @bjelle/tokens byttes av `:root[data-theme="dark"]`, og overlegg
 * som rendres i topplaget - native `<dialog>`, `::backdrop` - ligger utenfor
 * enhver wrapper. Satt lenger inn ville de beholdt lyst tema.
 */

/*
 * Bryterens tilstand har nøyaktig én eier: kanalhendelsen fra addonen.
 *
 * Første forsøk lot dekoratøren skrive tilbake fra `useDarkMode()` også. Det
 * ga to skrivere: på en docs-side tegnes ikke storiene på nytt når temaet
 * endres, så hooken der er foreldet - og neste vilkårlige re-render skrev den
 * gamle verdien tilbake. Resultatet var sidebar og preview i utakt, i tilfeldig
 * retning. Hooken brukes derfor ikke her i det hele tatt.
 */
const STORAGE_KEY = "sb-addon-themes-3";

function storedTheme(): boolean {
	// Addonen husker valget mellom økter. Uten dette blinker preview-en lys
	// før kanalen rekker å si fra ved innlasting.
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").current === "dark";
	} catch {
		return false;
	}
}

let toggleIsDark = storedTheme();
let override: string | undefined;

function apply() {
	const dark = override ? override === "dark" : toggleIsDark;
	document.documentElement.dataset.theme = dark ? "dark" : "light";
}

apply();

addons.getChannel().on(DARK_MODE_EVENT_NAME, (dark: boolean) => {
	toggleIsDark = dark;
	apply();
});

/**
 * Lar en enkelt story tvinge et tema, uavhengig av bryteren.
 *
 * Brukes av dark-tema-storyene, som er regresjonstester: axe skal kjøre
 * kontrastsjekken mot de mørke verdiene uansett hva bryteren står på.
 *
 * Kun i story-visning. På en docs-side står flere stories under hverandre på
 * samme `<html>`, og da kan ikke én av dem eie temaet for hele siden - der
 * bestemmer bryteren.
 */
const withTheme: Decorator = (Story, context) => {
	override =
		context.viewMode === "story" ? (context.globals.theme as string | undefined) : undefined;

	useEffect(apply);

	return <Story />;
};

const preview: Preview = {
	decorators: [withTheme],
	/*
	 * Slår av kontrollen for props som tar en ReactNode.
	 *
	 * Storybook tegner en objektinspektør for dem, og for et React-element blir
	 * det en skjermfylt dump av `$$typeof`, `_owner`, `_store` og hele
	 * kildeteksten til komponenten. Den er verken redigerbar eller lesbar, og
	 * den skyver den faktiske dokumentasjonen ut av syne.
	 *
	 * Raden blir stående med navn, beskrivelse og type - bare selve editoren
	 * forsvinner. Gjort her og ikke i hver story, så nye komponenter arver det.
	 */
	argTypesEnhancers: [
		(context) => {
			const argTypes = { ...context.argTypes };
			for (const [name, arg] of Object.entries(argTypes)) {
				const type = String(arg?.table?.type?.summary ?? "");
				if (/ReactNode|ReactElement|JSX\.Element/.test(type)) {
					argTypes[name] = { ...arg, control: false };
				}
			}
			return argTypes;
		},
	],
	globalTypes: {
		/*
		 * Ingen `toolbar`-blokk: bryteren kommer fra addonen, og to brytere for
		 * samme sak er verre enn ingen. Globalen finnes bare så enkeltstories
		 * kan tvinge et tema.
		 */
		theme: { description: "Overstyrer temaet for én story" },
	},
	parameters: {
		darkMode: {
			dark: darkTheme,
			light: lightTheme,
			current: "light",
			// Vi setter data-theme selv. Lar vi addonen style preview-en også,
			// får vi to mekanismer som kan komme i utakt.
			stylePreview: false,
		},
		options: {
			/*
			 * Uten dette sorterer Storybook etter rekkefølgen stories lastes i,
			 * altså filstien - da havner "Foundations" midt inne blant
			 * komponentene fordi mappa sorteres på f.
			 *
			 * Grunnlaget skal leses først: det forklarer hvilke farger, hvilken
			 * typografi og hvilket rutenett komponentene under er bygget av.
			 */
			storySort: {
				/*
				 * Sorterer resten på tittel. Uten den faller Storybook tilbake på
				 * filsti, og der sorterer bindestrek (0x2D) før skråstrek (0x2F):
				 * `avatar-group/` kommer før `avatar/`. Det ga AvatarGroup over
				 * Avatar, ButtonGroup over Button, IconButton og IconContainer over
				 * Icon, og Text liggende midt inne mellom TextLink og Textarea.
				 *
				 * `order` vinner over metoden, så lesrekkefølgen over står fast:
				 * Colors, Typography, Spacing. Guards står ikke der fordi den er
				 * `!dev`-tagget og aldri vises i sidemenyen - den er en
				 * regresjonsvakt, ikke en side å bla i.
				 */
				method: "alphabetical",
				order: ["Foundations", ["Colors", "Typography", "Spacing"], "Components"],
			},
		},
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		// Tilgjengelighetsbrudd skal feile, ikke bare rapporteres.
		a11y: { test: "error" },
	},
};

export default preview;
