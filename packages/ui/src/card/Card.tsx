import type { AnchorHTMLAttributes, HTMLAttributes } from "react";

export type CardVariant = "raised" | "outlined" | "flat";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends HTMLAttributes<HTMLElement> {
	variant?: CardVariant;
	/**
	 * Løft på hover og pekerkurs. Kortet må da også være klikkbart: enten via
	 * `href`, eller ved at det inneholder en `<CardLink>` som dekker flaten.
	 * Løft uten mål er en løgn overfor brukeren.
	 */
	interactive?: boolean;
	/** Innvendig luft. `md` er 24 px og standard for kort i systemet. */
	padding?: CardPadding;
	/** Gjør hele kortet til en lenke. Kortet rendres da som `<a>`. */
	href?: string;
	target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
	rel?: string;
}

const base = "relative block rounded-16 bg-background-raised font-sans text-text-strong";

const variants: Record<CardVariant, string> = {
	raised: "shadow-md",
	// Hårstrek i stedet for skygge, der flere kort ligger tett - stablede
	// skygger blir fort grumsete. Innvendig ring, ikke `border`: en kant på
	// 1 px spiser av innholdsboksen og skyver teksten i et utlinjet kort
	// nedover i forhold til nabokortet.
	outlined: "inset-ring-1 inset-ring-stroke-weak",
	// Ingen kant, ingen skygge. Forutsetter en flate som skiller seg fra
	// kortet selv, typisk bg-background-sunken.
	flat: "",
};

const paddings: Record<CardPadding, string> = {
	none: "p-0",
	sm: "p-4",
	md: "p-6",
	lg: "p-8",
};

/*
 * Løftet.
 *
 * To fallgruver, begge stille:
 *
 * 1. Tailwind 4 kompilerer `-translate-y-0.5` til CSS-egenskapen `translate`,
 *    ikke `transform`. `motion-reduce:transform-none` treffer derfor ingenting.
 * 2. `motion-reduce:*` kan uansett ikke overstyre `hover:*`: hover-regelen har
 *    én pseudoklasse mer og vinner på spesifisitet uansett rekkefølge. Løftet
 *    må slås _på_ under `motion-safe`, ikke av under `motion-reduce`.
 *
 * Tastaturfokus løfter likt som peker. Skyggen bytter uansett bevegelsesvalg -
 * den er en dybdeendring, ikke bevegelse.
 */
const interactiveClasses = [
	"cursor-pointer transition-[box-shadow,translate]",
	"hover:shadow-lg focus-visible:shadow-lg has-[[data-card-link]:focus-visible]:shadow-lg",
	"motion-safe:hover:-translate-y-0.5 motion-safe:focus-visible:-translate-y-0.5",
	"motion-safe:has-[[data-card-link]:focus-visible]:-translate-y-0.5",
].join(" ");

const focusRing =
	"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus";

export function Card({
	variant = "raised",
	interactive = false,
	padding = "md",
	href,
	className,
	children,
	...props
}: CardProps) {
	const classes = [
		base,
		variants[variant],
		paddings[padding],
		interactive && interactiveClasses,
		href && `no-underline ${focusRing}`,
		className,
	]
		.filter(Boolean)
		.join(" ");

	if (href !== undefined) {
		return (
			<a className={classes} href={href} {...props}>
				{children}
			</a>
		);
	}

	return (
		<div className={classes} {...props}>
			{children}
		</div>
	);
}

export interface CardLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
	href: string;
}

/**
 * Lenke som strekker treffflaten sin over hele kortet.
 *
 * Bruk denne når kortet har flere lenker: da kan ikke kortet selv være en
 * `<a>`, men hovedmålet skal likevel kunne treffes hvor som helst på flaten.
 * Overlegget posisjoneres mot kortet, som alltid er `relative`. Gi kortet
 * `interactive` i tillegg, så følger løft og pekerkurs med.
 *
 * Fokusringen tegnes på overlegget og rammer derfor inn hele kortet, ikke
 * bare lenketeksten. Andre lenker i kortet må ha `relative z-10` for å ligge
 * over overlegget.
 */
export function CardLink({ className, children, ...props }: CardLinkProps) {
	const classes = [
		"text-text-strong no-underline hover:underline underline-offset-2",
		"after:absolute after:inset-0 after:rounded-16",
		"focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-stroke-focus",
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<a className={classes} data-card-link="" {...props}>
			{children}
		</a>
	);
}
