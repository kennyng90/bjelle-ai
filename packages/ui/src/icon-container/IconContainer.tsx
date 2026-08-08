import type { HTMLAttributes } from "react";
import { Icon, type IconName } from "../icon/Icon.tsx";

export type IconContainerTone = "brand" | "neutral" | "success" | "warning" | "error" | "info";
export type IconContainerVariant = "soft" | "solid" | "outline";
export type IconContainerSize = "sm" | "md" | "lg" | "xl";
export type IconContainerShape = "rounded" | "circle";

export interface IconContainerProps extends HTMLAttributes<HTMLSpanElement> {
	icon?: IconName;
	tone?: IconContainerTone;
	variant?: IconContainerVariant;
	size?: IconContainerSize;
	shape?: IconContainerShape;
}

const skins: Record<IconContainerVariant, Record<IconContainerTone, string>> = {
	soft: {
		brand: "bg-fill-brand-weak text-icon-brand",
		neutral: "bg-fill-weak text-icon-neutral",
		success: "bg-fill-success-weak text-icon-success",
		warning: "bg-fill-warning-weak text-icon-warning",
		error: "bg-fill-error-weak text-icon-error",
		info: "bg-fill-information-weak text-icon-information",
	},
	solid: {
		// text-on-strong, ikke hvit: de fylte flatene er lyse i mørkt tema, og
		// hvitt ikon på lys flate forsvinner.
		brand: "bg-fill-brand-strong text-text-on-strong",
		neutral: "bg-fill-strong text-text-on-strong",
		success: "bg-fill-success-strong text-text-on-strong",
		warning: "bg-fill-warning-strong text-text-on-strong",
		error: "bg-fill-error-strong text-text-on-strong",
		info: "bg-fill-information-strong text-text-on-strong",
	},
	outline: {
		// Ekte border, ikke inset ring: da teller hårstreken i layout, og en
		// rad med outline- og soft-fliser står på samme optiske bredde.
		brand: "border border-stroke-brand-weak bg-background-base text-icon-brand",
		neutral: "border border-stroke-weak bg-background-base text-icon-neutral",
		success: "border border-stroke-success-weak bg-background-base text-icon-success",
		warning: "border border-stroke-warning-weak bg-background-base text-icon-warning",
		error: "border border-stroke-error-weak bg-background-base text-icon-error",
		info: "border border-stroke-information-weak bg-background-base text-icon-information",
	},
};

const sizes: Record<IconContainerSize, string> = {
	sm: "size-8",
	md: "size-10",
	lg: "size-12",
	xl: "size-14",
};

// Radiusen ligger for seg selv, ikke i `sizes`. To rounded-klasser på samme
// element avgjøres av rekkefølgen i stilarket, ikke av rekkefølgen i
// className, så `rounded-full` er ikke garantert å slå `rounded-8`. Én klasse
// om gangen fjerner hele spørsmålet.
const radii: Record<IconContainerSize, string> = {
	sm: "rounded-8",
	md: "rounded-12",
	lg: "rounded-12",
	xl: "rounded-16",
};

// Ikonet holder halve flisas kantlengde hele veien opp. Faste piksler her
// framfor 1em, fordi flisa ikke arver tekststørrelsen den står ved siden av.
const iconSizes: Record<IconContainerSize, number> = { sm: 16, md: 20, lg: 24, xl: 28 };

/**
 * Dekorativ flis med et ikon i - Practical UIs «featured icon».
 *
 * Den er bevisst uten tekstalternativ: flisa står alltid ved siden av en
 * overskrift eller en setning som bærer betydningen, og et ikon som gjentar
 * teksten er bare støy i skjermleseren. Trenger du et ikon som *er*
 * informasjonen, bruk `<Icon label="..." />` direkte.
 */
export function IconContainer({
	icon = "Star",
	tone = "brand",
	variant = "soft",
	size = "md",
	shape = "rounded",
	className,
	...props
}: IconContainerProps) {
	const classes = [
		"inline-flex shrink-0 items-center justify-center",
		sizes[size],
		shape === "circle" ? "rounded-full" : radii[size],
		skins[variant][tone],
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<span className={classes} {...props}>
			<Icon name={icon} size={iconSizes[size]} />
		</span>
	);
}
