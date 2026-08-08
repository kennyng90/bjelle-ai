import type { HTMLAttributes, ReactNode } from "react";
import { IconButton } from "../icon-button/IconButton.tsx";
import { SkipLink } from "./SkipLink.tsx";

// Slots i stedet for children: tre navngitte regioner med hver sin semantikk.
export interface HeaderProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
	/** Merke, logo eller brødsmuler. Ligger helt til venstre. */
	left?: ReactNode;
	center?: ReactNode;
	/** Handlinger, varsler, brukermeny. Ligger helt til høyre. */
	right?: ReactNode;
	/**
	 * Tilgjengelig navn på `<nav>`-en rundt `center`. Tom streng dropper
	 * landemerket - bruk det når `center` ikke er navigasjon, for eksempel når
	 * det er et søkefelt. Et navnløst nav-landemerke er verre enn ingen.
	 */
	navLabel?: string;
	/** Rendrer «Hopp til innhold» som headerens første fokuserbare element. */
	skipTo?: string;
	skipLabel?: string;
	/** Om panelet menyknappen styrer er åpent. Kontrollert. */
	menuOpen?: boolean;
	onMenuToggle?: (open: boolean) => void;
	/**
	 * id-en menyknappen styrer. Knappen rendres kun når både denne og
	 * `onMenuToggle` er satt, slik at `aria-controls` alltid peker på noe
	 * som finnes.
	 */
	menuControls?: string;
	/** Fester headeren til toppen av rullecontaineren. */
	sticky?: boolean;
}

export function Header({
	left,
	center,
	right,
	navLabel = "Toppmeny",
	skipTo,
	skipLabel = "Hopp til innhold",
	menuOpen = false,
	onMenuToggle,
	menuControls,
	sticky = false,
	className,
	...props
}: HeaderProps) {
	const showMenuButton = onMenuToggle !== undefined && menuControls !== undefined;

	return (
		<header
			className={[
				"relative flex h-16 shrink-0 items-center gap-4 border-b border-stroke-weak bg-background-base px-6 font-sans",
				sticky && "sticky top-0 z-40",
				className,
			]
				.filter(Boolean)
				.join(" ")}
			{...props}
		>
			{skipTo !== undefined && <SkipLink href={skipTo}>{skipLabel}</SkipLink>}

			<div className="flex shrink-0 items-center gap-4">
				{/*
				 * IconButton, ikke Button uten barn: en Button med bare ikon blir
				 * 52x40 av sin egen px-4 og står som et avlangt rektangel ved siden
				 * av de kvadratiske ikonknappene i handlingsfeltet.
				 */}
				{showMenuButton && (
					<IconButton
						aria-controls={menuControls}
						aria-expanded={menuOpen}
						icon={menuOpen ? "X" : "Menu"}
						label={menuOpen ? "Lukk meny" : "Åpne meny"}
						onClick={() => onMenuToggle(!menuOpen)}
						variant="tertiary"
					/>
				)}
				{left}
			</div>

			{center != null &&
				(navLabel ? (
					<nav aria-label={navLabel} className="flex min-w-0 flex-1 items-center justify-center">
						{center}
					</nav>
				) : (
					<div className="flex min-w-0 flex-1 items-center justify-center">{center}</div>
				))}

			<div className="ml-auto flex shrink-0 items-center gap-3">{right}</div>
		</header>
	);
}
