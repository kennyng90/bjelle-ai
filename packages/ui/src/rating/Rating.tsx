import { type KeyboardEvent, useRef } from "react";
import { Icon } from "../icon/Icon.tsx";

export type RatingSize = "sm" | "md" | "lg";

export interface RatingProps {
	/** Halve stjerner er kun meningsfulle skrivebeskyttet. Interaktiv modus runder til hel. */
	value?: number;
	max?: number;
	size?: RatingSize;
	/**
	 * Skrivebeskyttet er standard. Da er komponenten tekst med dekorative
	 * stjerner - ingenting kan fokuseres eller klikkes.
	 *
	 * `readOnly={false}` gjør den til en radiogruppe og krever både `label` og
	 * `onChange`. Verdien styres utenfra; komponenten holder ingen egen state.
	 */
	readOnly?: boolean;
	onChange?: (value: number) => void;
	/** Tilgjengelig navn på radiogruppa. Påkrevd i interaktiv modus. */
	label?: string;
	/** Viser verditeksten ved siden av stjernene i stedet for å skjule den visuelt. */
	showValueText?: boolean;
	className?: string;
}

const glyphSizes: Record<RatingSize, { box: string; icon: number }> = {
	sm: { box: "size-4", icon: 16 },
	md: { box: "size-5", icon: 20 },
	lg: { box: "size-6", icon: 24 },
};

const textSizes: Record<RatingSize, string> = {
	sm: "text-small",
	md: "text-small",
	lg: "text-body",
};

/** Runder til nærmeste halve og skriver den med norsk desimalkomma. */
function formatValue(value: number) {
	const rounded = Math.round(value * 2) / 2;
	return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
}

/*
 * Én stjerne, fylt fra 0 til 1. Halvfylt lages ved å klippe en fylt stjerne
 * over en tom - ikke med lucides StarHalf, som er en egen glyf med annen
 * geometri og derfor ikke står i flukt med naboene.
 */
function StarGlyph({ fill, size }: { fill: number; size: RatingSize }) {
	const { box, icon } = glyphSizes[size];

	return (
		<span className={`relative inline-flex shrink-0 ${box}`}>
			<Icon className="shrink-0 text-stroke-strong" name="Star" size={icon} />
			{fill > 0 && (
				<span
					className="absolute inset-y-0 left-0 flex overflow-hidden"
					style={{ width: `${fill * 100}%` }}
				>
					{/* shrink-0: uten den krymper svg-en til klippebredden i stedet for
					    å bli klippet, og en halv stjerne blir en liten hel stjerne. */}
					<Icon className="shrink-0 fill-current text-fill-yellow" name="Star" size={icon} />
				</span>
			)}
		</span>
	);
}

export function Rating({
	value = 0,
	max = 5,
	size = "md",
	readOnly = true,
	onChange,
	label,
	showValueText = false,
	className,
}: RatingProps) {
	const buttons = useRef<(HTMLButtonElement | null)[]>([]);
	const steps = Array.from({ length: max }, (_, i) => i + 1);

	if (readOnly) {
		const rounded = Math.round(value * 2) / 2;
		const text = `${formatValue(value)} av ${max} stjerner`;
		const wrapper = ["inline-flex items-center gap-3 font-sans", className]
			.filter(Boolean)
			.join(" ");

		return (
			<span className={wrapper}>
				{/* Stjernene er dekorasjon. Verdien står i teksten ved siden av. */}
				<span aria-hidden="true" className="inline-flex items-center gap-2">
					{steps.map((n) => (
						<StarGlyph fill={Math.min(Math.max(rounded - n + 1, 0), 1)} key={n} size={size} />
					))}
				</span>
				<span className={showValueText ? `${textSizes[size]} text-text-weak` : "sr-only"}>
					{text}
				</span>
			</span>
		);
	}

	const selected = Math.round(value);
	// Roving tabindex: gruppa koster én tabulator. Uten valgt verdi er den
	// første stjerna inngangen, slik ARIA-mønsteret for radiogruppe sier.
	const focused = selected >= 1 && selected <= max ? selected : 1;

	function moveTo(next: number) {
		buttons.current[next - 1]?.focus();
		onChange?.(next);
	}

	function handleKey(event: KeyboardEvent<HTMLButtonElement>, n: number) {
		let next: number;
		switch (event.key) {
			case "ArrowRight":
			case "ArrowDown":
				next = (n % max) + 1;
				break;
			case "ArrowLeft":
			case "ArrowUp":
				next = ((n - 2 + max) % max) + 1;
				break;
			case "Home":
				next = 1;
				break;
			case "End":
				next = max;
				break;
			default:
				return;
		}
		// Piltast i en radiogruppe skal ikke også rulle siden.
		event.preventDefault();
		moveTo(next);
	}

	const group = ["-mx-1 inline-flex items-center font-sans", className].filter(Boolean).join(" ");

	return (
		<div aria-label={label} className={group} role="radiogroup">
			{steps.map((n) => (
				// biome-ignore lint/a11y/useSemanticElements: se begrunnelsen i attributtlista
				<button
					aria-checked={n === selected}
					aria-label={`${n} av ${max} stjerner`}
					className="inline-flex cursor-pointer rounded-4 p-1 transition-colors hover:bg-fill-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus"
					key={n}
					onClick={() => onChange?.(n)}
					onKeyDown={(event) => handleKey(event, n)}
					ref={(node) => {
						buttons.current[n - 1] = node;
					}}
					// <input type="radio"> tegner sin egen kontrollboks. Skjuler man den og styler
					// stjerna i stedet, er det fokuserbare elementet en 1 px input mens trykkflaten
					// er en <label> - da må fokusringen forfalskes på en søskennode, og treffområdet
					// tilhører noe annet enn kontrollen. <button role="radio"> holder fokus,
					// trykkflate og tilstand på samme element. Komponenten er styrt utenfra og
					// deltar aldri i en form, så det eneste et native-element ville gitt, trengs ikke.
					role="radio"
					tabIndex={n === focused ? 0 : -1}
					type="button"
				>
					<StarGlyph fill={n <= selected ? 1 : 0} size={size} />
				</button>
			))}
		</div>
	);
}
