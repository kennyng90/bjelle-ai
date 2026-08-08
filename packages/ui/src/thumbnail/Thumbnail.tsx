import type { CSSProperties, HTMLAttributes } from "react";
import { Icon, type IconName } from "../icon/Icon.tsx";

export type ThumbnailRatio = "1/1" | "4/3" | "3/2" | "16/9";
export type ThumbnailRadius = 4 | 8 | 12 | 16 | 24;

export interface ThumbnailProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
	src?: string;
	/**
	 * Alternativ tekst. Tom streng betyr dekorativ - riktig når bildet bare
	 * gjentar noe som allerede står som tekst ved siden av.
	 */
	alt?: string;
	ratio?: ThumbnailRatio;
	radius?: ThumbnailRadius;
	/** Bredde. Uten den fyller flisa forelderen. */
	width?: number | string;
	/** Ikon i plassholderen når bildet mangler. */
	icon?: IconName;
}

/*
 * Kilden tar imot vilkårlige CSS-strenger for `ratio` og `radius`. Her er de
 * lukkede lister, ellers er det ingen vits i å ha tokens: en flis med
 * `radius: "7px"` er en flis som ikke hører til i systemet.
 */
const ratios: Record<ThumbnailRatio, string> = {
	"1/1": "aspect-square",
	"4/3": "aspect-[4/3]",
	"3/2": "aspect-[3/2]",
	"16/9": "aspect-video",
};

const radii: Record<ThumbnailRadius, string> = {
	4: "rounded-4",
	8: "rounded-8",
	12: "rounded-12",
	16: "rounded-16",
	24: "rounded-24",
};

export function Thumbnail({
	src,
	alt = "",
	ratio = "1/1",
	radius = 12,
	width,
	icon = "Image",
	className,
	style,
	...props
}: ThumbnailProps) {
	// Bredden er en ekte layoutverdi som kaller bestemmer, ikke et token.
	const styles: CSSProperties | undefined = width === undefined ? style : { width, ...style };

	/*
	 * Plassholderen får navnet fra `alt` når den har ett. Rollen er statisk i
	 * hver gren, ikke en betinget verdi - både for lesbarheten og fordi
	 * lintreglene for ARIA ikke kan følge et uttrykk.
	 */
	const placeholder = alt ? (
		<span aria-label={alt} className="flex size-full items-center justify-center" role="img">
			<Icon className="text-icon-neutral" name={icon} size={24} />
		</span>
	) : (
		<span className="flex size-full items-center justify-center">
			<Icon className="text-icon-neutral" name={icon} size={24} />
		</span>
	);

	return (
		<div
			className={[
				"relative shrink-0 overflow-hidden bg-fill-weak",
				width === undefined && "w-full",
				ratios[ratio],
				radii[radius],
				className,
			]
				.filter(Boolean)
				.join(" ")}
			style={styles}
			{...props}
		>
			{src ? <img alt={alt} className="size-full object-cover" src={src} /> : placeholder}

			{/*
			 * Hårstreken ligger som eget overlegg: en `inset-ring` males under
			 * innholdet, og bildet hadde da spist den.
			 */}
			<span
				aria-hidden="true"
				className={`pointer-events-none absolute inset-0 border border-stroke-overlay-weak ${radii[radius]}`}
			/>
		</div>
	);
}
