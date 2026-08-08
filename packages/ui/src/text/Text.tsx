import type { ElementType, HTMLAttributes } from "react";

export type TextSize = "lead" | "body" | "small" | "tiny";
export type TextWeight = "regular" | "medium" | "strong" | "bold";
export type TextTone =
	| "strong"
	| "weak"
	| "brand"
	| "error"
	| "success"
	| "warning"
	| "info"
	| "on-strong"
	| "inverse-strong"
	| "inverse-weak";
export type TextElement =
	| "p"
	| "span"
	| "div"
	| "strong"
	| "em"
	| "li"
	| "dd"
	| "dt"
	| "figcaption";

export interface TextProps extends HTMLAttributes<HTMLElement> {
	size?: TextSize;
	tone?: TextTone;
	weight?: TextWeight;
	/** Taggen som rendres. `p` er standard; bruk `li`, `dd` og `span` der `p` ikke er gyldig. */
	as?: TextElement;
}

const sizes: Record<TextSize, string> = {
	// lead (20px) og tiny (13px) hardkodet Practical UI utenom sin egen ramp.
	// Her er begge tokens, slik at de kan justeres ett sted.
	lead: "text-lead",
	body: "text-body",
	small: "text-small",
	tiny: "text-tiny",
};

const weights: Record<TextWeight, string> = {
	regular: "font-regular",
	medium: "font-medium",
	// 600, ikke 700. Det er `bold` som er 700.
	strong: "font-strong",
	bold: "font-bold",
};

const tones: Record<TextTone, string> = {
	strong: "text-text-strong",
	weak: "text-text-weak",
	brand: "text-text-brand",
	error: "text-text-error",
	success: "text-text-success",
	warning: "text-text-warning",
	info: "text-text-information",
	"on-strong": "text-text-on-strong",
	"inverse-strong": "text-text-inverse-strong",
	"inverse-weak": "text-text-inverse-weak",
};

export function Text({
	size = "body",
	tone = "strong",
	weight = "regular",
	as = "p",
	className,
	children,
	...props
}: TextProps) {
	const Tag = as as ElementType;
	const classes = [
		// text-pretty rydder opp i horunger på siste linje. Billigere enn
		// text-balance, og riktig for brødtekst der linjeantallet er høyt.
		"font-sans text-pretty",
		sizes[size],
		weights[weight],
		tones[tone],
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<Tag className={classes} {...props}>
			{children}
		</Tag>
	);
}
