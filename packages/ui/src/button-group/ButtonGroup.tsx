import { Children, cloneElement, type HTMLAttributes, isValidElement, type ReactNode } from "react";
import type { ButtonProps, ButtonSize, ButtonVariant } from "../button/Button.tsx";

export interface ButtonGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "role"> {
	/**
	 * Gruppens tilgjengelige navn, f.eks. "Visning" eller "Tekstjustering".
	 * `role="group"` uten navn forteller skjermleseren at noe hører sammen,
	 * men ikke hva.
	 */
	label?: string;
	/** Settes på barn som ikke har valgt sin egen størrelse. */
	size?: ButtonSize;
	/** Settes på barn som ikke har valgt sin egen variant. */
	variant?: ButtonVariant;
	children?: ReactNode;
}

/*
 * Geometrien ligger i foreldreklassene, ikke i inline-stiler på hvert barn slik
 * kilden gjorde. `[&>*:first-child]` gir selektoren `.gruppe > *:first-child`,
 * som er mer spesifikk enn Buttons egen `rounded-8` og derfor vinner uansett
 * hvor de havner i stilarket. Da slipper barna å vite at de står i en gruppe.
 *
 * `-ml-px` trekker hvert segment inn over naboens kant, slik at det står én
 * hårstrek mellom segmentene og ikke to. `isolate` + `relative` + `z-10` løfter
 * det fokuserte segmentet, ellers maler naboen over fokusringen.
 */
const base =
	"isolate inline-flex [&>*]:relative [&>*]:rounded-none [&>*:not(:first-child)]:-ml-px [&>*:focus-visible]:z-10 [&>*:hover]:z-10";

const outerRadius: Record<ButtonSize, string> = {
	sm: "[&>*:first-child]:rounded-l-8 [&>*:last-child]:rounded-r-8",
	md: "[&>*:first-child]:rounded-l-8 [&>*:last-child]:rounded-r-8",
	lg: "[&>*:first-child]:rounded-l-8 [&>*:last-child]:rounded-r-8",
	// Button bruker 12 på xl. Gruppa må følge etter, ellers får ytterkanten
	// et annet hjørne enn en enkeltstående xl-knapp.
	xl: "[&>*:first-child]:rounded-l-12 [&>*:last-child]:rounded-r-12",
};

export function ButtonGroup({
	label,
	size,
	variant = "secondary",
	className,
	children,
	...props
}: ButtonGroupProps) {
	const classes = [base, outerRadius[size ?? "md"], className].filter(Boolean).join(" ");

	const segments = Children.toArray(children)
		.filter(isValidElement<Partial<ButtonProps>>)
		.map((child) =>
			cloneElement(child, {
				size: child.props.size ?? size,
				variant: child.props.variant ?? variant,
			}),
		);

	return (
		/*
		 * Lintregelen foreslår <fieldset> her. Det er feil element: fieldset er
		 * for skjemakontroller, krever <legend> og har min-width: min-content
		 * som bryter layouten. En rad knapper som hører sammen er nettopp det
		 * ARIA-rollen "group" finnes for.
		 */
		// biome-ignore lint/a11y/useSemanticElements: se kommentaren over
		<div aria-label={label} className={classes} role="group" {...props}>
			{segments}
		</div>
	);
}
