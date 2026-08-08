import { icons } from "lucide-react";
import type { SVGProps } from "react";

/**
 * Navnene på ikonene som finnes. Utledet fra lucide-react, ikke skrevet av
 * hånd: da kan ikke lista råtne når biblioteket oppdateres, og en skrivefeil
 * i `name` blir en typefeil i stedet for et tomt hull i grensesnittet.
 */
export type IconName = keyof typeof icons;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
	name: IconName;
	/** Kantlengde i piksler. Følger ikonstørrelsene i designsystemet: 12-32. */
	size?: number;
	strokeWidth?: number;
	/**
	 * Ikoner er dekorative som standard og skjules for skjermlesere. Har ikonet
	 * betydning som ingen tekst i nærheten dekker, gi det en `label`.
	 */
	label?: string;
}

export function Icon({ name, size = 20, strokeWidth = 2, label, className, ...props }: IconProps) {
	const Glyph = icons[name];

	return (
		<Glyph
			aria-hidden={label ? undefined : true}
			aria-label={label}
			className={className}
			focusable="false"
			height={size}
			role={label ? "img" : undefined}
			strokeWidth={strokeWidth}
			width={size}
			{...props}
		/>
	);
}
