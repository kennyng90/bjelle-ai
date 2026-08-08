import type { HTMLAttributes } from "react";
import { Icon, type IconName } from "../icon/Icon.tsx";

export type BadgeColor = "neutral" | "brand" | "success" | "warning" | "error" | "info";
export type BadgeSize = "sm" | "md" | "lg";

// `color` finnes allerede på HTMLAttributes som et ikke-standard DOM-attributt.
// Vår betydning vinner, så den arvede må ut av typen.
export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
	color?: BadgeColor;
	size?: BadgeSize;
	/** Viser en statusprikk foran teksten. Dekor - tonen leses av teksten. */
	dot?: boolean;
	/** Ikon foran teksten. Dekorativt; teksten må stå på egne ben. */
	icon?: IconName;
}

const base =
	"inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-sans font-strong leading-none";

/*
 * De tonale fyllene er svake med vilje - 4-8 % dekning. Kontrasten mellom
 * tekstrollen og fyllet er derfor knapp i lyst tema: `warning` ligger lavest
 * på 4.73:1 mot kravet på 4.5:1. Teksten er 13-14 px, altså ikke "large text",
 * så kravet er 4.5 uansett størrelse. Bytter noen ut en tekstrolle her, må
 * tallet regnes om på nytt - det er ikke slark igjen.
 */
const colors: Record<BadgeColor, string> = {
	neutral: "bg-fill-weak text-text-strong",
	brand: "bg-fill-brand-weak text-text-brand",
	success: "bg-fill-success-weak text-text-success",
	warning: "bg-fill-warning-weak text-text-warning",
	error: "bg-fill-error-weak text-text-error",
	info: "bg-fill-information-weak text-text-information",
};

const dots: Record<BadgeColor, string> = {
	neutral: "bg-icon-neutral",
	brand: "bg-fill-brand-strong",
	success: "bg-fill-success-strong",
	warning: "bg-fill-warning-strong",
	error: "bg-fill-error-strong",
	info: "bg-fill-information-strong",
};

/*
 * Practical UI setter 20/24/28 px høyde og 12/13/14 px tekst. 28 finnes ikke på
 * rutenettet, og 12 finnes ikke i typerampen. Høydene følger derfor 20/24/32 og
 * teksten 13/13/14: `sm` og `md` skiller seg på tetthet, ikke på skriftgrad.
 */
const sizes: Record<BadgeSize, string> = {
	sm: "h-5 gap-1 px-2 text-tiny",
	md: "h-6 gap-1.5 px-3 text-tiny",
	lg: "h-8 gap-1.5 px-4 text-small",
};

const iconSizes: Record<BadgeSize, number> = { sm: 12, md: 14, lg: 16 };

/**
 * Passiv statusetikett. Badge sier hva noe *er* - den er ikke klikkbar og har
 * ingen tilstand brukeren kan endre. Skal etiketten kunne velges eller fjernes,
 * er det en `Tag`.
 *
 * Uten interaktivitet trenger den ingen `client:*`-direktiv i `apps/web`. Den
 * kan stå som statisk HTML.
 */
export function Badge({
	color = "neutral",
	size = "md",
	dot = false,
	icon,
	className,
	children,
	...props
}: BadgeProps) {
	const classes = [base, colors[color], sizes[size], className].filter(Boolean).join(" ");

	return (
		<span className={classes} {...props}>
			{dot && <span className={`size-1.5 shrink-0 rounded-full ${dots[color]}`} />}
			{icon && <Icon name={icon} size={iconSizes[size]} />}
			{children}
		</span>
	);
}
