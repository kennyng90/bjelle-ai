import type { HTMLAttributes } from "react";

export type SpinnerSize = "sm" | "md" | "lg";
export type SpinnerTone = "brand" | "neutral" | "inverse";

export interface SpinnerProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
	size?: SpinnerSize;
	tone?: SpinnerTone;
	/**
	 * Teksten skjermlesere får. Visuelt skjult med mindre `showLabel` er satt.
	 * En spinner uten tekst finnes ikke for en skjermleser.
	 */
	label?: string;
	showLabel?: boolean;
}

/*
 * Ringen er en sirkel med gjennomsiktig kant og én farget bue. Sporet må være
 * kantfarge og ikke bakgrunn: en bakgrunn ville fylt hele skiva, ikke bare
 * randen.
 *
 * `motion-reduce:animate-none` stopper rotasjonen for brukere med vestibulære
 * plager. Den fargede buen blir stående, så markøren leses fortsatt som
 * "noe pågår" - derfor er buen en firedel og ikke et umerkelig hakk.
 */
const ringBase =
	"inline-block shrink-0 animate-spin rounded-full border-solid motion-reduce:animate-none";

const ringSizes: Record<SpinnerSize, string> = {
	sm: "size-4 border-2",
	md: "size-6 border-2",
	lg: "size-10 border-[3px]",
};

const ringTones: Record<SpinnerTone, string> = {
	brand: "border-stroke-weak border-t-fill-brand-strong",
	neutral: "border-stroke-weak border-t-stroke-stronger",
	inverse: "border-stroke-inverse-weak border-t-stroke-inverse-stronger",
};

const labelTones: Record<SpinnerTone, string> = {
	brand: "text-text-weak",
	neutral: "text-text-weak",
	inverse: "text-text-inverse-weak",
};

const labelSizes: Record<SpinnerSize, string> = {
	sm: "text-small",
	md: "text-small",
	lg: "text-body",
};

export function Spinner({
	size = "md",
	tone = "brand",
	label = "Laster",
	showLabel = false,
	className,
	...props
}: SpinnerProps) {
	const classes = ["inline-flex items-center gap-3 font-sans", className].filter(Boolean).join(" ");

	return (
		// role="status" gir en høflig live-region, så teksten leses opp når
		// spinneren dukker opp - ikke bare når noen tabber innom.
		<span className={classes} role="status" {...props}>
			<span aria-hidden="true" className={`${ringBase} ${ringSizes[size]} ${ringTones[tone]}`} />
			<span className={showLabel ? `${labelSizes[size]} ${labelTones[tone]}` : "sr-only"}>
				{label}
			</span>
		</span>
	);
}
