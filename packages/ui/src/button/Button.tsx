import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
}

const base =
	"inline-flex items-center justify-center gap-2 rounded-control font-sans font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bjelle-600 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
	primary: "bg-bjelle-500 text-ink-950 hover:bg-bjelle-400 active:bg-bjelle-600",
	secondary: "bg-ink-100 text-ink-900 hover:bg-ink-200 active:bg-ink-300",
	ghost: "bg-transparent text-ink-700 hover:bg-ink-100 active:bg-ink-200",
};

const sizes: Record<ButtonSize, string> = {
	sm: "h-8 px-3 text-sm",
	md: "h-10 px-4 text-base",
	lg: "h-12 px-6 text-lg",
};

export function Button({
	variant = "primary",
	size = "md",
	type = "button",
	className,
	...props
}: ButtonProps) {
	const classes = [base, variants[variant], sizes[size], className].filter(Boolean).join(" ");

	return <button className={classes} type={type} {...props} />;
}
