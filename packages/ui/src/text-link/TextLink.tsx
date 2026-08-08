import type { AnchorHTMLAttributes } from "react";
import { Icon, type IconName } from "../icon/Icon.tsx";

export type TextLinkTone = "brand" | "neutral" | "error";
export type TextLinkSize = "inherit" | "lead" | "body" | "small" | "tiny";
export type TextLinkWeight = "regular" | "medium" | "strong" | "bold";
export type TextLinkUnderline = "always" | "hover" | "none";

export interface TextLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
	/** Påkrevd. En `<a>` uten `href` er verken lenke eller fokuserbar. */
	href: string;
	tone?: TextLinkTone;
	/** Standard er `inherit`: lenken tar størrelsen fra teksten den står i. */
	size?: TextLinkSize;
	weight?: TextLinkWeight;
	leadingIcon?: IconName;
	trailingIcon?: IconName;
	/**
	 * Standard er `always`. WCAG 1.4.1 tillater ikke at farge alene skiller
	 * lenken fra brødteksten, og Practical UIs `hover` er nettopp det for alle
	 * som ikke har en peker. `none` er kun for lenker som skiller seg fra
	 * teksten rundt på annet vis, som en frittstående lenke med ikon.
	 */
	underline?: TextLinkUnderline;
	/** Åpner i ny fane, setter `rel` og varsler både øye og skjermleser. */
	external?: boolean;
}

const tones: Record<TextLinkTone, string> = {
	brand: "text-text-brand",
	neutral: "text-text-strong",
	error: "text-text-error",
};

const sizes: Record<TextLinkSize, string> = {
	inherit: "",
	lead: "text-lead",
	body: "text-body",
	small: "text-small",
	tiny: "text-tiny",
};

const weights: Record<TextLinkWeight, string> = {
	regular: "font-regular",
	medium: "font-medium",
	strong: "font-strong",
	bold: "font-bold",
};

const underlines: Record<TextLinkUnderline, string> = {
	// Tykkere strek ved peker: en hover-tilbakemelding som ikke er farge, og
	// som ikke flytter en eneste piksel av teksten rundt.
	always: "underline decoration-1 underline-offset-2 hover:decoration-2",
	hover: "no-underline hover:underline hover:decoration-1 hover:underline-offset-2",
	none: "no-underline",
};

export function TextLink({
	tone = "brand",
	size = "inherit",
	weight = "strong",
	underline = "always",
	external = false,
	leadingIcon,
	trailingIcon,
	target,
	rel,
	className,
	children,
	...props
}: TextLinkProps) {
	const newTab = external || target === "_blank";
	// Ny fane skal også være synlig, ikke bare hørbar. Ikonet er standard, men
	// et eksplisitt `trailingIcon` vinner.
	const trailing = trailingIcon ?? (newTab ? "ExternalLink" : undefined);
	// Uten ikoner må lenken være `inline`. Practical UI setter inline-flex på
	// alle, og da nekter en lenke midt i et avsnitt å brekke over to linjer.
	const hasIcon = Boolean(leadingIcon || trailing);

	const classes = [
		"font-sans rounded-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
		// min-h-6 gir 24 pikslers trefflate (WCAG 2.5.8). En lenke med ikon er
		// nesten alltid frittstående, og da gjelder ikke unntaket for lenker
		// inne i en setning. Baselinjen flytter seg ikke: align-baseline tar
		// baselinjen fra tekstnoden, ikke fra bokshøyden.
		hasIcon ? "inline-flex min-h-6 items-center gap-1 align-baseline" : "inline",
		sizes[size],
		weights[weight],
		tones[tone],
		underlines[underline],
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<a
			className={classes}
			rel={newTab ? (rel ?? "noreferrer noopener") : rel}
			target={newTab ? "_blank" : target}
			{...props}
		>
			{/* Ikonet måles i em, ikke piksler: da følger det tekststørrelsen
			    lenken faktisk arver, også når `size` er `inherit`. */}
			{leadingIcon && <Icon className="size-[1em] shrink-0" name={leadingIcon} />}
			{children}
			{trailing && <Icon className="size-[1em] shrink-0" name={trailing} />}
			{newTab && <span className="sr-only"> (åpner i ny fane)</span>}
		</a>
	);
}
