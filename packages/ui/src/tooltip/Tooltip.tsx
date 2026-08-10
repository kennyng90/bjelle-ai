import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cloneElement, useEffect, useId, useState } from "react";

export type TooltipSide = "top" | "bottom" | "left" | "right";

export interface TooltipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
	/**
	 * Kort utdypning. Aldri interaktivt innhold - et tips kan ikke nås av alle,
	 * og noe som må klikkes hører hjemme et sted som ikke forsvinner. Teksten
	 * skal heller aldri være eneste kilde til informasjonen.
	 */
	label: ReactNode;
	side?: TooltipSide;
	/**
	 * Utløseren. Må være ett element som selv kan få tastaturfokus - en
	 * `<button>` eller `<a>` - og som tar imot `aria-describedby`.
	 */
	children: ReactElement<{ "aria-describedby"?: string }>;
}

/*
 * Avstanden til utløseren er gjennomsiktig polstring på tipset, ikke et hull.
 * Da henger flatene sammen, og pekeren kan flyttes fra utløseren og inn i
 * tipset uten at det lukker seg (WCAG 1.4.13 Hoverable).
 */
const sides: Record<TooltipSide, string> = {
	top: "bottom-full left-1/2 -translate-x-1/2 pb-2",
	bottom: "top-full left-1/2 -translate-x-1/2 pt-2",
	left: "right-full top-1/2 -translate-y-1/2 pr-2",
	right: "left-full top-1/2 -translate-y-1/2 pl-2",
};

/**
 * Tips som vises på hover og på tastaturfokus, kobles til utløseren med
 * `aria-describedby`, og lukkes med Escape.
 *
 * `theme`-propen fra kilden er droppet: flaten er alltid den inverse, og den
 * snur allerede med temaet. To temaakser oppå hverandre ga bare kombinasjoner
 * ingen skulle bruke.
 *
 * I `apps/web` må utløseren monteres med `client:load` eller `client:visible`.
 * Uten det rendres kun utløseren som statisk HTML, og tipset dukker aldri opp.
 */
export function Tooltip({ label, side = "top", children, className, ...props }: TooltipProps) {
	const id = useId();
	const [open, setOpen] = useState(false);
	// Escape holder tipset lukket til pekeren faktisk forlater utløseren, eller
	// fokus flyttes. Uten den ville det neste `mousemove` åpne det igjen med én
	// gang, og brukeren fikk aldri lukket noe.
	const [dismissed, setDismissed] = useState(false);

	// Koblingen settes bare mens tipset finnes. En `aria-describedby` som peker
	// på et element som ikke er i dokumentet er en referanse uten dekning.
	const describedBy = [children.props["aria-describedby"], open ? id : undefined]
		.filter(Boolean)
		.join(" ");

	const trigger = cloneElement(children, { "aria-describedby": describedBy || undefined });

	/*
	 * Escape lyttes på dokumentet, ikke på wrapperen.
	 *
	 * WCAG 1.4.13 Dismissible krever at tipset kan lukkes uten å flytte peker
	 * eller fokus. Åpnes det med pekeren, står fokus fortsatt på `<body>` -
	 * en `onKeyDown` på wrapperen ser da aldri tasten, og pekerbrukeren har
	 * ingen måte å bli kvitt tipset på. Lytteren finnes bare mens tipset er
	 * åpent og fjernes i opprydningen, så den overlever ikke unmount.
	 */
	useEffect(() => {
		if (!open) {
			return;
		}
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				// Lukkes uten å flytte fokus - utløseren skal beholde det.
				setOpen(false);
				setDismissed(true);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [open]);

	/*
	 * Åpnes på `mousemove`, ikke på `mouseenter`.
	 *
	 * Nettleseren syntetiserer en full enter-kjede uten at pekeren har rørt
	 * seg, hver gang DOM-en under den endrer seg - komponenten monteres under
	 * en hvilende peker, eller boblen fjernes. `mouseenter` alene åpnet da et
	 * tips ingen ba om, og gjenåpnet det brukeren nettopp lukket med Escape.
	 * Et ekte pekerbesøk gir alltid `mousemove` etterpå.
	 */
	const handleMouseMove = () => {
		// Kjører på hver pekerbevegelse over utløseren, så den skal ikke sende en
		// tilstandsendring nettleseren uansett kaster.
		if (!open && !dismissed) {
			setOpen(true);
		}
	};

	const handleMouseLeave = () => {
		setOpen(false);
		setDismissed(false);
	};

	const handleFocus = () => {
		if (!dismissed) {
			setOpen(true);
		}
	};

	const handleBlur = () => {
		setOpen(false);
		setDismissed(false);
	};

	return (
		// Hover og fokus fanges her, ikke på knappen: tipset ligger inne i wrapperen,
		// og pekeren skal kunne flyttes fra utløseren og inn i tipset uten at
		// mouseleave fyrer og river det bort under pekeren (WCAG 1.4.13).
		// biome-ignore lint/a11y/noStaticElementInteractions: wrapperen er ikke utløseren og skal ikke ha en rolle - knappen inni har sin egen
		<span
			className={["relative inline-flex", className].filter(Boolean).join(" ")}
			{...props}
			onBlur={handleBlur}
			onFocus={handleFocus}
			onMouseLeave={handleMouseLeave}
			onMouseMove={handleMouseMove}
		>
			{trigger}
			{open && (
				<span className={`absolute z-50 w-max max-w-64 ${sides[side]}`}>
					<span
						className="block rounded-8 bg-background-inverse px-2.5 py-1.5 font-medium text-text-inverse-strong text-tiny shadow-lg"
						id={id}
						role="tooltip"
					>
						{label}
					</span>
				</span>
			)}
		</span>
	);
}
