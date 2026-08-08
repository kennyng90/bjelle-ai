import type { HTMLAttributes, KeyboardEvent, ReactElement, ReactNode } from "react";
import { cloneElement, useId, useState } from "react";

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

	// Koblingen settes bare mens tipset finnes. En `aria-describedby` som peker
	// på et element som ikke er i dokumentet er en referanse uten dekning.
	const describedBy = [children.props["aria-describedby"], open ? id : undefined]
		.filter(Boolean)
		.join(" ");

	const trigger = cloneElement(children, { "aria-describedby": describedBy || undefined });

	const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
		if (event.key === "Escape") {
			// Lukkes uten å flytte fokus - utløseren skal beholde det.
			setOpen(false);
		}
	};

	return (
		// Hover og fokus fanges her, ikke på knappen: tipset ligger inne i wrapperen,
		// og pekeren skal kunne flyttes fra utløseren og inn i tipset uten at
		// mouseleave fyrer og river det bort under pekeren (WCAG 1.4.13).
		// biome-ignore lint/a11y/noStaticElementInteractions: wrapperen er ikke utløseren og skal ikke ha en rolle - knappen inni har sin egen
		<span
			className={["relative inline-flex", className].filter(Boolean).join(" ")}
			{...props}
			onBlur={() => setOpen(false)}
			onFocus={() => setOpen(true)}
			onKeyDown={handleKeyDown}
			onMouseEnter={() => setOpen(true)}
			onMouseLeave={() => setOpen(false)}
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
