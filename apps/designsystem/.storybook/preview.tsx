import type { Decorator, Preview } from "@storybook/react-vite";
import { useEffect } from "react";
import { darkTheme, lightTheme } from "./theme.ts";
import "./preview.css";

/*
 * Temaet bor på `<html>`, ikke på en wrapper rundt storyen.
 *
 * Tokenene i @bjelle/tokens byttes av `.dark` på rotelementet, og overlegg som
 * rendres i topplaget - native `<dialog>`, `::backdrop` - ligger utenfor enhver
 * wrapper. Satt lenger inn ville de beholdt lyst tema.
 *
 * Selve byttet gjør storybook-dark-mode med `classTarget`, `darkClass`,
 * `lightClass` og `stylePreview` nederst i denne fila. Det er addonens
 * dokumenterte oppsett, og det er poenget: bryteren har da nøyaktig én eier.
 *
 * Her lå det tidligere en håndskrevet variant som leste addonens localStorage-
 * nøkkel og lyttet på kanalhendelsen selv. Den ga to skrivere på samme
 * attributt, og de kunne komme i utakt fordi kanalhendelsen og React-rendringen
 * ikke har noen garantert rekkefølge: sidebaren sto lys mens preview-en var
 * mørk. Koden er borte, og med den hele feilklassen.
 */

/**
 * Lar en enkelt story tvinge et tema, uavhengig av bryteren.
 *
 * Brukes av dark-tema-storyene, som er regresjonstester: axe skal kjøre
 * kontrastsjekken mot de mørke verdiene uansett hva bryteren står på.
 *
 * Overstyringen bruker `data-theme` og ikke klassen addonen eier, nettopp så de
 * to ikke skriver på samme sted. Attributtet har høyere spesifisitet enn
 * klassen i tokenfila, så det vinner så lenge det står der - og forsvinner i det
 * en story uten overstyring rendres.
 *
 * Kun i story-visning. På en docs-side står flere stories under hverandre på
 * samme `<html>`, og da kan ikke én av dem eie temaet for hele siden - der
 * bestemmer bryteren.
 */
const withTheme: Decorator = (Story, context) => {
	const forced =
		context.viewMode === "story" ? (context.globals.theme as string | undefined) : undefined;

	useEffect(() => {
		if (forced) {
			document.documentElement.dataset.theme = forced;
		} else {
			document.documentElement.removeAttribute("data-theme");
		}
	});

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
			/*
			 * Addonen bytter temaet i preview-en også, ikke bare i sidebaren.
			 * `stylePreview` er bryteren for det, `classTarget` peker på
			 * rotelementet framfor `<body>` (overlegg i topplaget ligger utenfor
			 * body), og klassenavnene er de tokenfila allerede lytter på.
			 */
			classTarget: "html",
			darkClass: "dark",
			lightClass: "light",
			stylePreview: true,
		},
		/*
		 * Tømmer Storybooks innebygde bakgrunnsvelger.
		 *
		 * Den maler en fast farge på storyen og kjenner ikke temaet. Med begge
		 * påslått sto det to velgere i verktøylinja som så ut til å gjøre det
		 * samme: valgte du bakgrunnen "light" mens temaet var mørkt, ble
		 * story-ruta lysegrå mens resten av siden - og komponenten i den - var
		 * mørk. Temaet eier bakgrunnen.
		 *
		 * En tom `options` og ikke `disable: true`: flagget slår av hele addonen,
		 * og rutenettet ligger i den samme. Uten valg å velge mellom skjuler
		 * velgeren seg selv, mens "Grid visibility" blir stående.
		 */
		backgrounds: { options: {} },
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
