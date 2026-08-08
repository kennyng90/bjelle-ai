import { type HTMLAttributes, type ReactNode, useId } from "react";

export type ProgressBarSize = "sm" | "md" | "lg";
export type ProgressBarTone = "brand" | "success" | "error";

export interface ProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, "role"> {
	value?: number;
	max?: number;
	/** Synlig etikett over baren. Kobles til sporet med `aria-labelledby`. */
	label?: ReactNode;
	/** Viser prosenten til høyre for etiketten. Ignoreres når framdriften er ukjent. */
	showValue?: boolean;
	size?: ProgressBarSize;
	tone?: ProgressBarTone;
	/** Ukjent framdrift. Utelater `aria-valuenow` - det er slik ARIA sier "vet ikke". */
	indeterminate?: boolean;
	/**
	 * Verdien i ord, for når prosent ikke er hele historien: "3 av 8 steg".
	 * Uten den regner skjermleseren ut prosent av `max` og sier "37 %".
	 */
	valueText?: string;
}

const trackSizes: Record<ProgressBarSize, string> = { sm: "h-1", md: "h-2", lg: "h-3" };

/*
 * Fyllet er aldri smalere enn sporet er høyt.
 *
 * `rounded-full` er 9999px, men CSS skalerer radiusene ned til halve den
 * korteste siden. Er fyllet smalere enn det er høyt - 1 % av en smal bar -
 * blir radiusen bredde/2 i stedet for høyde/2, og enden slutter å flukte med
 * sporets egen runding: fyllet reiser seg opp som en stående pille med spisse
 * topp og bunn i stedet for å ligge som en avrundet stubbe i renna.
 *
 * Med en minstebredde lik sporhøyden er fyllet i verste fall en hel sirkel,
 * og begge ender har nøyaktig samme radius som sporet. Minstebredden gjelder
 * bare når det faktisk finnes framdrift; 0 % skal være helt tomt.
 */
const minFills: Record<ProgressBarSize, string> = {
	sm: "min-w-1",
	md: "min-w-2",
	lg: "min-w-3",
};

const fillTones: Record<ProgressBarTone, string> = {
	brand: "bg-fill-brand-strong",
	success: "bg-fill-success-strong",
	error: "bg-fill-error-strong",
};

/*
 * Sporet trenger omtrent 10 % nøytral for å leses som en fordypning. `fill-weak`
 * (4 %) forsvinner på hvitt, og kildens `fill-overlay` (45 %) er så mørkt at det
 * konkurrerer med fyllet - og i mørkt tema peker den rollen på nesten svart, så
 * sporet ville forsvunnet helt. `fill-press` er valøren som stemmer og som snur
 * riktig; navnet handler om trykk, men skalaen er den samme.
 */
const track = "w-full overflow-hidden rounded-full bg-fill-press";

export function ProgressBar({
	value = 0,
	max = 100,
	label,
	showValue = false,
	size = "md",
	tone = "brand",
	indeterminate = false,
	valueText,
	className,
	...props
}: ProgressBarProps) {
	const labelId = useId();
	const safeMax = max > 0 ? max : 100;
	const clamped = Math.min(Math.max(value, 0), safeMax);
	const percent = (clamped / safeMax) * 100;

	const showLabel = label != null;
	const showPercent = showValue && !indeterminate;
	const wrapper = ["flex w-full flex-col gap-2 font-sans", className].filter(Boolean).join(" ");

	return (
		<div className={wrapper}>
			{(showLabel || showPercent) && (
				<div
					className={`flex items-baseline gap-4 text-small ${
						// Uten etikett har prosenten ingenting å skyve mot, og
						// justify-between ville dumpet den i venstre kant.
						showLabel ? "justify-between" : "justify-end"
					}`}
				>
					{showLabel && (
						<span className="font-medium text-text-strong" id={labelId}>
							{label}
						</span>
					)}
					{showPercent && (
						// tabular-nums holder tallet like bredt fra 9 til 99, så
						// etiketten ikke rykker mens baren fylles.
						<span className="tabular-nums text-text-weak">{`${Math.round(percent)} %`}</span>
					)}
				</div>
			)}
			<div
				aria-labelledby={showLabel ? labelId : undefined}
				aria-valuemax={safeMax}
				aria-valuemin={0}
				aria-valuenow={indeterminate ? undefined : clamped}
				aria-valuetext={indeterminate ? undefined : valueText}
				className={`${track} ${trackSizes[size]}`}
				role="progressbar"
				{...props}
			>
				{indeterminate ? (
					// Ukjent framdrift: en tredjedels segment som sveiper. Under
					// prefers-reduced-motion byttes sveipet mot en pust i opasitet,
					// som er den anbefalte erstatningen for bevegelse.
					<div
						className={`h-full w-1/3 animate-progress-sweep rounded-full motion-reduce:w-full motion-reduce:animate-pulse ${fillTones[tone]}`}
					/>
				) : (
					<div
						className={`h-full rounded-full transition-[width] ${fillTones[tone]} ${
							percent > 0 ? minFills[size] : ""
						}`}
						style={{ width: `${percent}%` }}
					/>
				)}
			</div>
		</div>
	);
}
