import { type KeyboardEvent, useId, useRef, useState } from "react";
import { Icon, type IconName } from "../icon/Icon.tsx";

export interface ToggleOption {
	value: string;
	label: string;
	icon?: IconName;
	disabled?: boolean;
}

export type ToggleGroupSize = "sm" | "md";

export interface ToggleGroupProps {
	/** Navnet på gruppa. Kreves - en radiogruppe uten navn er ubrukelig i skjermleser. */
	label: string;
	/** Skjuler labelen for øyet, men beholder den for skjermleseren. */
	hideLabel?: boolean;
	options: (ToggleOption | string)[];
	/** Styrt modus. Utelat for å la komponenten holde valget selv. */
	value?: string;
	defaultValue?: string;
	size?: ToggleGroupSize;
	disabled?: boolean;
	fullWidth?: boolean;
	onChange?: (value: string) => void;
	id?: string;
	className?: string;
}

const sizes: Record<ToggleGroupSize, string> = {
	sm: "h-8 gap-1.5 px-3 text-small",
	md: "h-10 gap-2 px-4 text-small",
};

const iconSizes: Record<ToggleGroupSize, number> = { sm: 16, md: 18 };

function normalize(options: (ToggleOption | string)[]): ToggleOption[] {
	return options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
}

/**
 * Segmentert kontroll: gjensidig utelukkende valg i en pille.
 *
 * Dette er en radiogruppe, ikke tre knapper. Knapper ville latt brukeren tabbe
 * gjennom hvert segment og gitt null hint om at valgene henger sammen. Her
 * ligger bare det valgte segmentet i tabrekkefølgen (roving tabindex), og
 * piltastene flytter valget slik APG beskriver for radiogrupper.
 *
 * Bytter kontrollen ut innhold i stedet for å sette en verdi, er det en Tabs
 * og ikke denne.
 *
 * Indikatoren er posisjonert i prosent, ikke målt med DOM-en. Det gjør den
 * SSR-trygg: den ligger riktig allerede i første HTML fra serveren, uten et
 * hopp ved hydrering. Prisen er at alle segmenter er like brede.
 *
 * I `apps/web` er dette en øy: den trenger `client:load` eller `client:visible`.
 * Uten client-direktiv virker verken klikk eller piltaster.
 */
export function ToggleGroup({
	label,
	hideLabel = false,
	options,
	value,
	defaultValue,
	size = "md",
	disabled = false,
	fullWidth = false,
	onChange,
	id,
	className,
}: ToggleGroupProps) {
	const base = useId();
	const groupId = id ?? `${base}-group`;
	const labelId = `${base}-label`;

	const normalizedOptions = normalize(options);
	const controlled = value !== undefined;
	const [internalValue, setInternalValue] = useState(
		defaultValue ?? normalizedOptions[0]?.value ?? "",
	);
	const selected = controlled ? value : internalValue;
	const buttons = useRef<(HTMLButtonElement | null)[]>([]);

	const selectedIndex = normalizedOptions.findIndex((o) => o.value === selected);
	const isDisabled = (index: number) => disabled || Boolean(normalizedOptions[index]?.disabled);

	// Er det valgte segmentet sperret, må et annet bære tabindex 0. Ellers
	// finnes det ingen vei inn i gruppa med tastatur.
	const tabbable =
		selectedIndex >= 0 && !isDisabled(selectedIndex)
			? selectedIndex
			: normalizedOptions.findIndex((_, i) => !isDisabled(i));

	function select(index: number) {
		const option = normalizedOptions[index];
		if (!option || isDisabled(index)) return;
		if (!controlled) setInternalValue(option.value);
		onChange?.(option.value);
		buttons.current[index]?.focus();
	}

	/** Neste ikke-sperrede segment i gitt retning, med rundgang. */
	function next(from: number, step: number) {
		for (let i = 1; i <= normalizedOptions.length; i++) {
			const candidate = (from + step * i + normalizedOptions.length * i) % normalizedOptions.length;
			if (!isDisabled(candidate)) return candidate;
		}
		return from;
	}

	function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
		const direction: Record<string, number> = {
			ArrowRight: 1,
			ArrowDown: 1,
			ArrowLeft: -1,
			ArrowUp: -1,
		};

		if (event.key in direction) {
			event.preventDefault();
			select(next(index, direction[event.key] as number));
			return;
		}
		if (event.key === "Home") {
			event.preventDefault();
			select(next(normalizedOptions.length - 1, 1));
			return;
		}
		if (event.key === "End") {
			event.preventDefault();
			select(next(0, -1));
		}
	}

	const count = normalizedOptions.length;

	return (
		<div className={["flex flex-col gap-1.5 font-sans", className].filter(Boolean).join(" ")}>
			<span
				className={hideLabel ? "sr-only" : "text-small font-strong text-text-strong"}
				id={labelId}
			>
				{label}
			</span>

			<div
				aria-labelledby={labelId}
				className={[
					// 6 px polstring, ikke 4: fokusringen på et segment stikker 4 px ut
					// (2 px offset + 2 px strek), og med 4 px polstring ligger den
					// nøyaktig i kanten av pilla og skjærer hjørnene.
					"relative grid grid-flow-col auto-cols-fr rounded-12 bg-background-sunken p-1.5",
					fullWidth ? "w-full" : "w-fit",
				].join(" ")}
				id={groupId}
				role="radiogroup"
			>
				{selectedIndex >= 0 && (
					<span
						aria-hidden="true"
						className={[
							"pointer-events-none absolute inset-y-1.5 left-1.5 rounded-8 bg-background-base shadow-sm",
							// Gliden er pynt. Den som har bedt om mindre bevegelse skal
							// se indikatoren hoppe, ikke skli.
							"transition-transform motion-reduce:transition-none",
							disabled && "opacity-45",
						]
							.filter(Boolean)
							.join(" ")}
						data-testid="segmented-indicator"
						// Ekte dynamiske verdier: bredden avhenger av antall segmenter og
						// posisjonen av hvilket som er valgt. 100 % er polstringsboksen,
						// derfor må de 2x6 px polstring trekkes fra.
						style={{
							width: `calc((100% - 0.75rem) / ${count})`,
							transform: `translateX(${selectedIndex * 100}%)`,
						}}
					/>
				)}

				{normalizedOptions.map((option, index) => {
					const active = option.value === selected;
					return (
						// biome-ignore lint/a11y/useSemanticElements: <input type="radio"> kan ikke bære et segment med ikon og tekst og samtidig ha roving tabindex. Knapp med role="radio" er APGs egen anbefaling for denne kontrollen.
						<button
							aria-checked={active}
							className={[
								"relative z-10 flex items-center justify-center rounded-8 font-strong whitespace-nowrap",
								// Bare farge og bakgrunn. transition-colors ville tatt med outline-color,
								// og da toner fokusringen inn i stedet for å vises straks.
								"transition-[color,background-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
								"disabled:cursor-not-allowed disabled:text-text-disabled",
								sizes[size],
								active ? "text-text-strong" : "text-text-weak hover:text-text-strong",
							].join(" ")}
							disabled={isDisabled(index)}
							key={option.value}
							onClick={() => select(index)}
							onKeyDown={(event) => handleKey(event, index)}
							ref={(node) => {
								buttons.current[index] = node;
							}}
							role="radio"
							tabIndex={index === tabbable ? 0 : -1}
							type="button"
						>
							{option.icon && <Icon name={option.icon} size={iconSizes[size]} />}
							{option.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}
