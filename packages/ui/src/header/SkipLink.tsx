import type { AnchorHTMLAttributes } from "react";

export interface SkipLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
	/** Målet det hoppes til. Skal være id-en på sidens `<main>`. */
	href?: string;
}

/*
 * Skjult til den får fokus. Klippes med clip-path framfor Tailwinds `sr-only`,
 * fordi `not-sr-only` nullstiller position og padding i samme utility-lag som
 * klassene som skal overstyre den - hvem som vinner avgjøres da av rekkefølgen
 * i stilarket, ikke av rekkefølgen i className. Her er tilstandene skrevet ut,
 * så det ikke er noe å gjette på.
 *
 * `focus:` og ikke `focus-visible:`: lenken er usynlig og nås bare med Tab, og
 * `focus-visible` treffer ikke pålitelig når fokus flyttes programmatisk.
 */
const hidden = "absolute top-4 left-4 z-50 h-px w-px overflow-hidden p-0 [clip-path:inset(50%)]";
const visible =
	"focus:h-auto focus:w-auto focus:overflow-visible focus:px-4 focus:py-2 focus:[clip-path:none]";
const appearance =
	"whitespace-nowrap rounded-8 bg-background-raised text-small font-strong text-text-strong shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-stroke-focus";

export function SkipLink({
	href = "#innhold",
	className,
	children = "Hopp til innhold",
	...props
}: SkipLinkProps) {
	return (
		<a
			className={[hidden, visible, appearance, className].filter(Boolean).join(" ")}
			href={href}
			{...props}
		>
			{children}
		</a>
	);
}
