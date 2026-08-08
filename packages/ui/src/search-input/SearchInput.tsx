import { type InputHTMLAttributes, useId, useRef, useState } from "react";
import { Icon } from "../icon/Icon.tsx";

export type SearchInputSize = "sm" | "md";

export interface SearchInputProps
	extends Omit<
		InputHTMLAttributes<HTMLInputElement>,
		"size" | "type" | "onChange" | "value" | "defaultValue"
	> {
	/** Synlig label. Uten den får feltet navnet «Søk», så det aldri står navnløst. */
	label?: string;
	value?: string;
	defaultValue?: string;
	size?: SearchInputSize;
	/**
	 * Får den nye verdien, ikke hendelsen. Fyrer også med tom streng når feltet
	 * tømmes, slik at et kontrollert felt holder seg i takt uten ekstra kobling.
	 */
	onChange?: (value: string) => void;
	onClear?: () => void;
	/** Navnet på tøm-knappen. Den har bare et ikon, så navnet må komme herfra. */
	clearLabel?: string;
}

// Chromes egen kryss-knapp i type="search" skrus av: vi har vår egen, og to
// kryss ved siden av hverandre er ett for mye.
const fieldBase =
	"w-full rounded-8 border border-stroke-strong bg-background-base font-sans text-text-strong transition-[border-color,background-color] placeholder:text-text-weak focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus disabled:cursor-not-allowed disabled:border-stroke-disabled disabled:bg-fill-disabled disabled:text-text-disabled [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none";

// Søkeikon til venstre, tøm-knapp til høyre. Begge holder seg innenfor
// polstringen, så teksten aldri løper under dem.
const sizes: Record<SearchInputSize, string> = {
	sm: "h-10 pl-10 pr-10 text-small",
	md: "h-12 pl-12 pr-12 text-body",
};

const searchInset: Record<SearchInputSize, string> = { sm: "left-3", md: "left-4" };
const iconSizes: Record<SearchInputSize, number> = { sm: 16, md: 20 };

/*
 * Tøm-knappen er ikonet pluss 8, og innrykket er søkeikonets innrykk minus 4.
 * Da får krysset samme optiske marg til kanten som søkeikonet har på sin side
 * (16 i md, 12 i sm), og hover-flaten får like mye luft rundt glyfen i begge
 * størrelser. Krysset følger `iconSizes`; sto det fast på 16 ble det synlig
 * mindre enn søkeikonet i md, og de to glyfene i samme felt sprikte i vekt.
 */
const clearSizes: Record<SearchInputSize, string> = { sm: "size-6", md: "size-7" };
const clearInset: Record<SearchInputSize, string> = { sm: "right-2", md: "right-3" };

export function SearchInput({
	label,
	value,
	defaultValue,
	placeholder = "Søk",
	size = "md",
	disabled = false,
	id,
	className,
	onChange,
	onClear,
	clearLabel = "Tøm søk",
	"aria-label": ariaLabel,
	...props
}: SearchInputProps) {
	const generatedId = useId();
	const fieldId = id ?? generatedId;
	const fieldRef = useRef<HTMLInputElement>(null);
	const controlled = value !== undefined;
	// Speiler bare det ukontrollerte feltet, og kun for å vite om tøm-knappen
	// skal stå der. Selve verdien eier DOM-en i den modusen.
	const [internalValue, setInternalValue] = useState(defaultValue ?? "");
	const currentValue = controlled ? value : internalValue;

	const handleInput = (newValue: string) => {
		if (!controlled) setInternalValue(newValue);
		onChange?.(newValue);
	};

	const clear = () => {
		if (!controlled && fieldRef.current) fieldRef.current.value = "";
		setInternalValue("");
		onChange?.("");
		onClear?.();
		// Knappen forsvinner i samme øyeblikk. Uten dette faller fokus til <body>
		// og tastaturbrukeren mister plassen sin i skjemaet.
		fieldRef.current?.focus();
	};

	return (
		<div className={["flex flex-col gap-2 font-sans", className].filter(Boolean).join(" ")}>
			{label && (
				<label
					className={[
						"text-small font-strong",
						disabled ? "text-text-disabled" : "text-text-strong",
					].join(" ")}
					htmlFor={fieldId}
				>
					{label}
				</label>
			)}
			<div className="relative">
				<Icon
					className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${searchInset[size]} ${
						disabled ? "text-icon-disabled" : "text-icon-neutral"
					}`}
					name="Search"
					size={iconSizes[size]}
				/>
				<input
					{...props}
					aria-label={label ? undefined : (ariaLabel ?? "Søk")}
					className={[fieldBase, sizes[size]].join(" ")}
					disabled={disabled}
					id={fieldId}
					onChange={(event) => handleInput(event.target.value)}
					placeholder={placeholder}
					ref={fieldRef}
					type="search"
					{...(controlled ? { value } : { defaultValue })}
				/>
				{currentValue.length > 0 && (
					<button
						aria-label={clearLabel}
						className={`absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full text-icon-neutral transition-colors hover:bg-fill-hover hover:text-icon-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus disabled:cursor-not-allowed disabled:text-icon-disabled disabled:hover:bg-transparent ${clearSizes[size]} ${clearInset[size]}`}
						disabled={disabled}
						onClick={clear}
						type="button"
					>
						<Icon name="X" size={iconSizes[size]} />
					</button>
				)}
			</div>
		</div>
	);
}
