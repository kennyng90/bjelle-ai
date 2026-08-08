import { type ChangeEvent, useId, useState } from "react";

export interface SliderProps {
	/** Synlig label. Kobles til kontrollen med htmlFor. */
	label: string;
	/** Styrt modus. Utelat for å la komponenten holde verdien selv. */
	value?: number;
	defaultValue?: number;
	min?: number;
	max?: number;
	step?: number;
	disabled?: boolean;
	/** Viser tallet ved siden av labelen. */
	showValue?: boolean;
	supportingText?: string;
	/** Formaterer verdien for øyet og for aria-valuetext, f.eks. `(v) => \`${v} %\``. */
	formatValue?: (value: number) => string;
	onChange?: (value: number) => void;
	id?: string;
	name?: string;
	className?: string;
}

/** Håndtakets diameter i piksler. WCAG 2.2 krever minst 24x24 som pekermål. */
const HANDLE = 24;

const handle = [
	"[&::-webkit-slider-runnable-track]:h-6 [&::-webkit-slider-runnable-track]:bg-transparent",
	"[&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none",
	"[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2",
	"[&::-webkit-slider-thumb]:border-fill-brand-strong [&::-webkit-slider-thumb]:bg-background-base",
	"[&::-webkit-slider-thumb]:shadow-sm",
	"[&::-moz-range-track]:h-6 [&::-moz-range-track]:bg-transparent",
	"[&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:appearance-none",
	"[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
	"[&::-moz-range-thumb]:border-fill-brand-strong [&::-moz-range-thumb]:bg-background-base",
].join(" ");

/**
 * Enkeltverdi-skyver med fylt spor.
 *
 * Bygget på `<input type="range">`. Da følger piltaster, Home, End, PageUp,
 * PageDown, dra med mus, berøring og skjermleserens verdiannonsering med gratis
 * og korrekt. Et egendefinert håndtak med `role="slider"` måtte etterlignet alt
 * dette, og ville blitt dårligere.
 *
 * Sporet og fyllet er egne elementer bak inputen i stedet for en
 * `linear-gradient` på bakgrunnen. Det holder fargene i tokenklasser i stedet
 * for i en inline gradient, og lar fyllet stoppe nøyaktig i håndtakets senter -
 * en gradient i rene prosenter bommer med opptil en halv håndtaksbredde i hver
 * ende.
 *
 * SSR-trygg og uten interne effekter. I `apps/web` trenger den likevel
 * `client:load` eller `client:visible` for å kunne dras eller styres med
 * tastatur.
 */
export function Slider({
	label,
	value,
	defaultValue = 50,
	min = 0,
	max = 100,
	step = 1,
	disabled = false,
	showValue = false,
	supportingText,
	formatValue,
	onChange,
	id,
	name,
	className,
}: SliderProps) {
	const base = useId();
	const fieldId = id ?? `${base}-field`;
	const helpId = `${base}-help`;

	const controlled = value !== undefined;
	const [internalValue, setInternalValue] = useState(defaultValue);
	const currentValue = controlled ? value : internalValue;

	const span = max - min;
	const ratio = span > 0 ? (currentValue - min) / span : 0;
	const percent = Math.min(Math.max(ratio, 0), 1) * 100;
	// Inputens håndtak beveger seg mellom senter-venstre og senter-høyre, altså
	// over (bredde - HANDLE) piksler. Fyllet må følge samme bane, ellers ligger
	// enden i feil side av håndtaket i ytterpunktene.
	const offset = ((50 - percent) * HANDLE) / 100;
	const display = formatValue ? formatValue(currentValue) : String(currentValue);

	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		const newValue = Number(event.target.value);
		if (!controlled) setInternalValue(newValue);
		onChange?.(newValue);
	}

	return (
		<div className={["flex flex-col gap-2 font-sans", className].filter(Boolean).join(" ")}>
			<div className="flex items-baseline justify-between gap-4">
				<label className="text-small font-strong text-text-strong" htmlFor={fieldId}>
					{label}
				</label>
				{showValue && (
					// Skjult for skjermleseren: den leser allerede verdien fra
					// kontrollen, og to kilder gir dobbel opplesning.
					<span aria-hidden="true" className="text-small font-strong text-text-strong tabular-nums">
						{display}
					</span>
				)}
			</div>

			{/* Dempingen ligger på hele sporet, ikke på hvert lag for seg. Med
			    opacity på både fyllet og inputen blir håndtaket halvgjennomsiktig,
			    og da skinner fyllet gjennom og stopper synlig midt inni håndtaket.
			    Ett lag rundt alt: lagene dekker hverandre først, så dempes summen. */}
			<div
				className={["relative flex h-6 items-center", disabled && "opacity-45"]
					.filter(Boolean)
					.join(" ")}
			>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-fill-press"
				/>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute left-0 h-1.5 rounded-full bg-fill-brand-strong"
					data-testid="slider-fill"
					// Ekte dynamisk verdi. Resten av kontrollen er tokenklasser.
					style={{ width: `calc(${percent}% + ${offset}px)` }}
				/>
				<input
					aria-describedby={supportingText ? helpId : undefined}
					aria-valuetext={formatValue ? display : undefined}
					className={[
						"absolute inset-x-0 h-6 w-full cursor-pointer appearance-none bg-transparent",
						"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
						"disabled:cursor-not-allowed",
						handle,
					].join(" ")}
					disabled={disabled}
					id={fieldId}
					max={max}
					min={min}
					name={name}
					onChange={handleChange}
					step={step}
					type="range"
					value={currentValue}
				/>
			</div>

			{supportingText && (
				<p className="text-small text-text-weak" id={helpId}>
					{supportingText}
				</p>
			)}
		</div>
	);
}
