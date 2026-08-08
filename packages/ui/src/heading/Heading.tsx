import type { ElementType, HTMLAttributes } from "react";

export type HeadingLevel = "display" | "h1" | "h2" | "h3" | "h4";
/**
 * Semantisk rang - hvilken `<hN>` som rendres. Skilt fra `HeadingLevel`,
 * som er trinnet i typerampen. Komponenter som lager en overskrift av
 * innhold de ikke eier (Accordion, EmptyState) må la kallstedet velge
 * rangen, ellers hopper de i hierarkiet på sider de ikke kjenner.
 * 1 er utelatt med vilje: sidens h1 eies av siden, ikke av en komponent.
 */
export type HeadingRank = 2 | 3 | 4 | 5 | 6;
export type HeadingElement = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
export type HeadingTone = "strong" | "weak" | "brand" | "on-strong" | "inverse-strong";

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
	/** Utseendet: hvilket trinn av typerampen overskriften tegnes med. */
	level?: HeadingLevel;
	/**
	 * Semantikken: hvilken tagg som rendres. Settes den ikke, følger taggen
	 * `level` (og `display` blir `h1`).
	 *
	 * Dette skillet er hele poenget med komponenten. En seksjon langt nede på
	 * siden kan trenge display-størrelse uten å være sidens `h1`; da er
	 * `level="display" as="h2"` riktig. Å velge størrelse ved å velge tagg
	 * lager hull i overskriftshierarkiet, og det er et reelt brudd for alle
	 * som navigerer med overskriftsliste.
	 */
	as?: HeadingElement;
	tone?: HeadingTone;
}

const levels: Record<HeadingLevel, string> = {
	// Rampen setter størrelse, linjehøyde og sperring i ett token. Practical UI
	// satte letterSpacing ved siden av fontSize; her ligger den i tokenet, så
	// den kan ikke komme i utakt med størrelsen.
	display: "text-display",
	h1: "text-h1",
	h2: "text-h2",
	h3: "text-h3",
	h4: "text-h4",
};

const defaultElements: Record<HeadingLevel, HeadingElement> = {
	display: "h1",
	h1: "h1",
	h2: "h2",
	h3: "h3",
	h4: "h4",
};

const tones: Record<HeadingTone, string> = {
	strong: "text-text-strong",
	weak: "text-text-weak",
	brand: "text-text-brand",
	"on-strong": "text-text-on-strong",
	"inverse-strong": "text-text-inverse-strong",
};

export function Heading({
	level = "h2",
	as,
	tone = "strong",
	className,
	children,
	...props
}: HeadingProps) {
	// Union av intrinsics: TSX klarer ikke å slå sammen propstypene for en
	// union av tagger, så variabelen er bredere enn `as` er.
	const Tag = (as ?? defaultElements[level]) as ElementType;
	const classes = [
		// text-balance holder siste linje fra å bli ett enslig ord. Overskrifter
		// er korte nok til at nettleseren har råd til å regne på det.
		"font-sans font-strong text-balance",
		levels[level],
		tones[tone],
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<Tag className={classes} {...props}>
			{children}
		</Tag>
	);
}
