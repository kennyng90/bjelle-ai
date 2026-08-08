import type { ButtonHTMLAttributes } from "react";
import type { ButtonSize, ButtonVariant } from "../button/Button.tsx";
import { Icon, type IconName } from "../icon/Icon.tsx";

export type IconButtonShape = "rounded" | "circle";

export interface IconButtonProps
	extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
	icon: IconName;
	/**
	 * Knappens tilgjengelige navn. Påkrevd med vilje: en ikonknapp har ingen
	 * synlig tekst, så uten dette er den navnløs for skjermlesere og axe feiler.
	 * Skriv handlingen, ikke ikonet - "Slett varsel", ikke "Papirkurv".
	 */
	label: string;
	variant?: ButtonVariant;
	size?: ButtonSize;
	/** "rounded" er standard. "circle" til flytende knapper og avatarmenyer. */
	shape?: IconButtonShape;
	/** Viser spinner og sperrer knappen. */
	loading?: boolean;
}

/*
 * Klassetabellene er ikke delt med Button, og det er med vilje. Størrelsene er
 * kvadratiske bokser uten polstring i stedet for høyde + px, og de flate
 * variantene fargelegger et ikon (`text-icon-*`) framfor tekst. Å bygge dette
 * oppå Button ville krevd at `px-4` og `text-text-strong` ble overstyrt via
 * `className`, og Tailwind avgjør slike konflikter på rekkefølgen i stilarket,
 * ikke i `className`. Varianten og størrelsen deler navn med Button - det er
 * språket som er felles, ikke klassestrengene.
 */
// duration-120 (kildens --duration-fast) - samme tempo som Button.
const base =
	"inline-flex shrink-0 items-center justify-center transition-[background-color,box-shadow,color] duration-120 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus disabled:cursor-not-allowed disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
	primary: "bg-fill-brand-strong text-text-on-strong hover:bg-fill-brand-strong-hover",
	// Innvendig ring, ikke `border`. Samme valg som i Button og Card: ringen
	// males oppå flata i stedet for å spise 1px av innsiden.
	secondary:
		"inset-ring-1 inset-ring-stroke-strong bg-background-base text-icon-strong shadow-xs hover:bg-fill-hover",
	// Kilden lar ikonet stå i --icon-neutral hele tida. Det er 3.2:1 mot hvitt -
	// akkurat innafor SC 1.4.11, men tynt når ikonet er hele affordansen.
	// Hover strammer det til icon-strong.
	tertiary: "bg-transparent text-icon-neutral hover:bg-fill-hover hover:text-icon-strong",
	"brand-tertiary": "bg-transparent text-icon-brand hover:bg-fill-brand-weak",
	destructive: "bg-fill-error-strong text-text-on-strong hover:bg-fill-error-strong-hover",
};

/*
 * Boksene følger Buttons høyder: 32 / 40 / 48 / 56. Minsteflaten er dermed
 * 32x32, godt over de 24x24 WCAG 2.2 SC 2.5.8 krever.
 */
const sizes: Record<ButtonSize, string> = {
	sm: "size-8 rounded-8",
	md: "size-10 rounded-8",
	lg: "size-12 rounded-8",
	xl: "size-14 rounded-12",
};

const circleSizes: Record<ButtonSize, string> = {
	sm: "size-8 rounded-full",
	md: "size-10 rounded-full",
	lg: "size-12 rounded-full",
	xl: "size-14 rounded-full",
};

const iconSizes: Record<ButtonSize, number> = { sm: 16, md: 20, lg: 20, xl: 24 };

export function IconButton({
	icon,
	label,
	variant = "tertiary",
	size = "md",
	shape = "rounded",
	type = "button",
	loading = false,
	disabled = false,
	className,
	...props
}: IconButtonProps) {
	const classes = [
		base,
		variants[variant],
		shape === "circle" ? circleSizes[size] : sizes[size],
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<button
			aria-busy={loading || undefined}
			aria-label={label}
			className={classes}
			disabled={disabled || loading}
			type={type}
			{...props}
		>
			<Icon
				className={loading ? "animate-spin" : undefined}
				name={loading ? "Loader" : icon}
				size={iconSizes[size]}
			/>
		</button>
	);
}
