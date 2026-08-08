import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "../icon/Icon.tsx";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "brand-tertiary" | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	leadingIcon?: IconName;
	trailingIcon?: IconName;
	fullWidth?: boolean;
	/** Viser spinner og sperrer knappen. Teksten blir stående. */
	loading?: boolean;
}

// duration-120 er kildens --duration-fast. Tailwind-standarden i
// packages/tokens/theme.css er 180ms (--duration-base), som er riktig for
// flater som beveger seg, men trått for en knapp under pekeren.
const base =
	"inline-flex shrink-0 items-center justify-center whitespace-nowrap font-sans font-strong leading-none tracking-[-0.01em] transition-[background-color,box-shadow] duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus disabled:cursor-not-allowed disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
	primary: "bg-fill-brand-strong text-text-on-strong hover:bg-fill-brand-strong-hover",
	// Hårstrek framfor fyll, som en innvendig ring og ikke en `border`. En
	// border spiser 1px av innsiden, så teksten i en sekundærknapp ville stått
	// 1px lenger inn enn i en primærknapp med samme padding. Ringen males oppå
	// flata i stedet og lar boksmodellen være i fred. Card gjør det samme.
	secondary:
		"inset-ring-1 inset-ring-stroke-strong bg-background-base text-text-strong shadow-xs hover:bg-fill-hover",
	tertiary: "bg-transparent text-text-strong hover:bg-fill-hover",
	"brand-tertiary": "bg-transparent text-text-brand hover:bg-fill-brand-weak",
	destructive: "bg-fill-error-strong text-text-on-strong hover:bg-fill-error-strong-hover",
};

const sizes: Record<ButtonSize, string> = {
	sm: "h-8 gap-1.5 rounded-8 px-3 text-small",
	md: "h-10 gap-2 rounded-8 px-4 text-body",
	lg: "h-12 gap-2 rounded-8 px-5 text-body",
	// Practical UI setter 18px her. Rampen har ikke 18, og et enkeltstående
	// unntak er ikke verdt å bryte den for. 20px er nærmeste trinn.
	xl: "h-14 gap-2.5 rounded-12 px-6 text-lead",
};

const iconSizes: Record<ButtonSize, number> = { sm: 16, md: 20, lg: 20, xl: 24 };

export function Button({
	variant = "primary",
	size = "md",
	type = "button",
	leadingIcon,
	trailingIcon,
	fullWidth = false,
	loading = false,
	disabled = false,
	className,
	children,
	...props
}: ButtonProps) {
	const iconSize = iconSizes[size];
	const classes = [base, variants[variant], sizes[size], fullWidth && "w-full", className]
		.filter(Boolean)
		.join(" ");

	return (
		<button
			aria-busy={loading || undefined}
			className={classes}
			disabled={disabled || loading}
			type={type}
			{...props}
		>
			{loading ? (
				<Icon className="animate-spin" name="Loader" size={iconSize} />
			) : (
				leadingIcon && <Icon name={leadingIcon} size={iconSize} />
			)}
			{children != null && <span>{children}</span>}
			{!loading && trailingIcon && <Icon name={trailingIcon} size={iconSize} />}
		</button>
	);
}
