import type { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../icon/Icon.tsx";

export type MetricTrend = "up" | "down" | "flat";

export interface MetricItemProps extends HTMLAttributes<HTMLDivElement> {
	label: ReactNode;
	value: ReactNode;
	/** Endringen som tekst, f.eks. "+12 %". Ta med fortegnet. */
	delta?: ReactNode;
	trend?: MetricTrend;
	caption?: ReactNode;
}

/*
 * Retningen formidles tre ganger, med vilje: farge, ikon og et ord som bare
 * skjermlesere får. Farge alene er brudd på WCAG 1.4.1, og en bruker som
 * skrur av farger skal fortsatt se hvilken vei det går.
 */
const trends: Record<MetricTrend, { icon: IconName; color: string; label: string }> = {
	up: { icon: "TrendingUp", color: "text-text-success", label: "Oppgang" },
	down: { icon: "TrendingDown", color: "text-text-error", label: "Nedgang" },
	flat: { icon: "Minus", color: "text-text-weak", label: "Uendret" },
};

export function MetricItem({
	label,
	value,
	delta,
	trend,
	caption,
	className,
	...props
}: MetricItemProps) {
	const direction = trend ? trends[trend] : undefined;
	const classes = ["flex flex-col gap-1 font-sans", className].filter(Boolean).join(" ");

	return (
		<div className={classes} {...props}>
			<span className="text-small font-medium text-text-weak">{label}</span>
			<div className="flex flex-wrap items-baseline gap-2">
				<span className="text-h2 font-strong text-text-strong">{value}</span>
				{delta != null && (
					/*
					 * `items-baseline`, ikke `items-center`.
					 *
					 * Raden over justerer på grunnlinje. En inline-flex uten et eneste
					 * grunnlinjejustert barn låner grunnlinjen sin fra underkanten av
					 * første flex-punkt - her ikonet - og da havnet "+12 %" fire piksler
					 * over grunnlinja til tallet ved siden av. Med `items-baseline` er
					 * teksten grunnlinjekilden, og ikonet holdes midtstilt av
					 * `self-center`. Linjehøyden er den samme, så ikonet står der det
					 * sto.
					 */
					<span
						className={[
							"inline-flex items-baseline gap-1 text-small font-strong",
							direction?.color ?? "text-text-weak",
						].join(" ")}
					>
						{direction && (
							<Icon className="self-center" name={direction.icon} size={16} strokeWidth={2.5} />
						)}
						{direction && <span className="sr-only">{direction.label}</span>}
						{delta}
					</span>
				)}
			</div>
			{caption != null && <span className="text-tiny text-text-weak">{caption}</span>}
		</div>
	);
}
