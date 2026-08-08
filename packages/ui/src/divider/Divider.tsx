import type { HTMLAttributes } from "react";

export type DividerOrientation = "horizontal" | "vertical";

export interface DividerProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "role"> {
	orientation?: DividerOrientation;
	/** Tekst midt i linja. Kun vannrett. */
	label?: string;
	/**
	 * Ren dekor. Da skal linja ikke annonseres som skille, for da lyver den om
	 * strukturen. Bruk den når innholdet allerede er delt av noe annet.
	 */
	decorative?: boolean;
}

/*
 * Kilden bruker `<div role="separator">`. Et skille mellom innhold er `<hr>` -
 * elementet betyr nøyaktig dette, og rollen følger med gratis. Alle tre
 * variantene er derfor `<hr>`; den merkede har bare en flex-ramme rundt seg
 * fordi `<hr>` ikke kan ha barn.
 *
 * `border-0` nullstiller Tailwinds preflight, som gir `<hr>` en topkant.
 * Selve streken tegnes med bakgrunn, så den oppfører seg likt begge veier.
 */
const line = "shrink-0 border-0 bg-stroke-weak";

export function Divider({
	orientation = "horizontal",
	label,
	decorative = false,
	className,
	...props
}: DividerProps) {
	if (label && orientation === "horizontal") {
		/*
		 * Navnet ligger på `<hr>`-en, ikke på en `<div role="separator">`.
		 *
		 * En separator gjør barna sine presentasjonelle, så den synlige teksten
		 * hadde vært stum uansett - navnet må komme fra `aria-label` i begge
		 * løsninger. Da er `<hr>` det ærligste valget: rollen følger av
		 * elementet, og de tre variantene av Divider blir samme element.
		 * Den synlige teksten skjules, ellers annonseres "Eller" to ganger.
		 */
		return (
			<div
				className={["flex w-full items-center gap-3", className].filter(Boolean).join(" ")}
				{...props}
			>
				<hr
					aria-hidden={decorative || undefined}
					aria-label={decorative ? undefined : label}
					className={`h-px flex-1 ${line}`}
				/>
				<span aria-hidden="true" className="font-sans font-medium text-text-weak text-tiny">
					{label}
				</span>
				<span className={`h-px flex-1 ${line}`} />
			</div>
		);
	}

	if (orientation === "vertical") {
		return (
			<hr
				aria-orientation={decorative ? undefined : "vertical"}
				// Preflight gir `<hr>` `height: 0`. Den må tilbake til `auto` før
				// `self-stretch` kan fylle høyden på flex-raden linja står i.
				className={["h-auto w-px self-stretch", line, className].filter(Boolean).join(" ")}
				role={decorative ? "presentation" : undefined}
				{...props}
			/>
		);
	}

	return (
		<hr
			className={["h-px w-full", line, className].filter(Boolean).join(" ")}
			role={decorative ? "presentation" : undefined}
			{...props}
		/>
	);
}
