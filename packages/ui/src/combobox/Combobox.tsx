import {
	type ChangeEvent,
	type KeyboardEvent,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { Icon } from "../icon/Icon.tsx";

export interface ComboboxOption {
	value: string;
	label: string;
}

export interface ComboboxProps {
	/** Synlig label. Kobles til feltet med htmlFor, aldri bare visuelt. */
	label: string;
	options: (ComboboxOption | string)[];
	/** Styrt modus. Utelat for å la komponenten holde valget selv. */
	value?: string;
	defaultValue?: string;
	placeholder?: string;
	supportingText?: string;
	/** Setter aria-invalid og viser meldingen i et alert-område. */
	error?: string;
	disabled?: boolean;
	/** Vises og annonseres når søket ikke gir treff. */
	emptyText?: string;
	id?: string;
	/** Legger på et skjult felt med valgt verdi, så kontrollen kan postes i et skjema. */
	name?: string;
	onChange?: (value: string) => void;
	className?: string;
}

// mt-2 og ikke mt-1: fokusringen rundt feltet stikker 4 px ut, og med
// 4 px avstand ville lista ligget klistret inntil ringen.
const surface =
	"absolute top-full right-0 left-0 z-50 mt-2 rounded-12 border border-stroke-weak bg-background-overlay shadow-lg";

function normalize(options: (ComboboxOption | string)[]): ComboboxOption[] {
	return options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
}

/**
 * Søkbar enkeltvelger etter ARIA APG-mønsteret «combobox with list autocomplete».
 *
 * DOM-fokus blir i inputen hele tiden. Uthevingen i lista styres av
 * `aria-activedescendant`, slik at piltastene ikke river fokus ut av skrivefeltet.
 *
 * Lista lukkes på blur i stedet for via en `document`-lytter. Det holder
 * komponenten SSR-trygg - ingen `document` i modulscope eller under render -
 * og dekker tastatur og mus med samme kode.
 *
 * I `apps/web` er dette en øy: den trenger `client:load` (eller `client:visible`
 * hvis den ligger under folden). Uten client-direktiv rendres den som statisk
 * HTML, og da åpner ikke lista seg.
 */
export function Combobox({
	label,
	options,
	value,
	defaultValue,
	placeholder = "Søk",
	supportingText,
	error,
	disabled = false,
	emptyText = "Ingen treff",
	id,
	name,
	onChange,
	className,
}: ComboboxProps) {
	const base = useId();
	const fieldId = id ?? `${base}-field`;
	const listId = `${base}-list`;
	const helpId = `${base}-help`;
	const errorId = `${base}-error`;

	const normalizedOptions = useMemo(() => normalize(options), [options]);
	const controlled = value !== undefined;
	const [internalValue, setInternalValue] = useState(defaultValue ?? "");
	const selected = controlled ? value : internalValue;
	const selectedLabel = normalizedOptions.find((o) => o.value === selected)?.label ?? "";

	// null betyr «ikke søkt på noe» - feltet viser da valgt label. Uten dette
	// skillet kan ikke Escape vite hva den skal rulle tilbake til.
	const [search, setSearch] = useState<string | null>(null);
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(-1);
	const fieldRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLUListElement>(null);

	const matches = useMemo(() => {
		if (search === null || search.trim() === "") return normalizedOptions;
		const q = search.toLowerCase();
		return normalizedOptions.filter((o) => o.label.toLowerCase().includes(q));
	}, [normalizedOptions, search]);

	// Lista kan krympe under føttene på uthevingen. Klemmes her i stedet for i
	// hver handler, så aria-activedescendant aldri peker på en borte option.
	const activeIndex = matches.length === 0 ? -1 : Math.min(active, matches.length - 1);
	const activeId = activeIndex >= 0 ? `${base}-option-${activeIndex}` : undefined;

	useEffect(() => {
		if (!open || activeIndex < 0) return;
		listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
	}, [open, activeIndex]);

	function close() {
		setOpen(false);
		setActive(-1);
		setSearch(null);
	}

	function select(option: ComboboxOption) {
		if (!controlled) setInternalValue(option.value);
		onChange?.(option.value);
		close();
		// Safari flytter ikke alltid fokus tilbake av seg selv etter et museklikk.
		fieldRef.current?.focus();
	}

	function handleTyping(event: ChangeEvent<HTMLInputElement>) {
		setSearch(event.target.value);
		setOpen(true);
		setActive(0);
	}

	function handleKey(event: KeyboardEvent<HTMLInputElement>) {
		if (disabled) return;

		if (event.key === "ArrowDown") {
			event.preventDefault();
			if (!open) {
				setOpen(true);
				// Alt+pil ned åpner uten å utheve, slik APG beskriver.
				const start = matches.findIndex((o) => o.value === selected);
				setActive(event.altKey ? -1 : Math.max(start, 0));
				return;
			}
			if (matches.length === 0) return;
			setActive(activeIndex + 1 >= matches.length ? 0 : activeIndex + 1);
			return;
		}

		if (event.key === "ArrowUp") {
			event.preventDefault();
			if (!open) {
				setOpen(true);
				setActive(matches.length - 1);
				return;
			}
			if (matches.length === 0) return;
			setActive(activeIndex <= 0 ? matches.length - 1 : activeIndex - 1);
			return;
		}

		if (event.key === "Enter") {
			if (!open || activeIndex < 0) return;
			// Bare når lista er åpen. Ellers skal Enter sende skjemaet.
			event.preventDefault();
			const option = matches[activeIndex];
			if (option) select(option);
			return;
		}

		if (event.key === "Escape") {
			if (!open) return;
			event.preventDefault();
			close();
			return;
		}

		if (event.key === "Tab" && open) close();
	}

	const invalid = Boolean(error);
	const descriptions = [supportingText ? helpId : null, error ? errorId : null]
		.filter(Boolean)
		.join(" ");
	const showList = open && matches.length > 0;
	const status = open ? (matches.length > 0 ? `${matches.length} treff` : emptyText) : "";

	return (
		<div className={["flex flex-col gap-1.5 font-sans", className].filter(Boolean).join(" ")}>
			<label className="text-small font-strong text-text-strong" htmlFor={fieldId}>
				{label}
			</label>

			<div className="relative">
				<Icon
					className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-icon-neutral"
					name="Search"
					size={18}
				/>
				<input
					aria-activedescendant={activeId}
					aria-autocomplete="list"
					aria-controls={listId}
					aria-describedby={descriptions || undefined}
					aria-expanded={open}
					aria-invalid={invalid || undefined}
					autoComplete="off"
					className={[
						// px-12 og ikke pl-11/pr-10: ikonene ligger på left-4/right-4 og er
						// 18 px, så 48 px polstring gir 14 px luft på begge sider - samme
						// innrykk som SearchInput og TextInput i md.
						"h-12 w-full rounded-8 border bg-background-base px-12 text-body text-text-strong",
						// Ikke transition-colors: den tar med outline-color, og da toner
						// fokusringen inn over 180 ms i stedet for å stå der med en gang.
						"transition-[background-color,border-color] placeholder:text-text-weak",
						"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
						"disabled:cursor-not-allowed disabled:bg-fill-disabled disabled:text-text-disabled",
						invalid ? "border-stroke-error-strong" : "border-stroke-strong",
					].join(" ")}
					disabled={disabled}
					id={fieldId}
					onBlur={() => {
						if (open) close();
					}}
					onChange={handleTyping}
					onClick={() => {
						if (disabled || open) return;
						setOpen(true);
						setActive(
							Math.max(
								matches.findIndex((o) => o.value === selected),
								0,
							),
						);
					}}
					// Markerer verdien ved fokus, så det brukeren skriver erstatter den
					// i stedet for å bli limt bak.
					onFocus={(event) => event.currentTarget.select()}
					onKeyDown={handleKey}
					placeholder={placeholder}
					ref={fieldRef}
					role="combobox"
					type="text"
					value={search ?? selectedLabel}
				/>
				<Icon
					className={[
						"pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-icon-neutral transition-transform",
						open && "rotate-180",
					]
						.filter(Boolean)
						.join(" ")}
					name="ChevronDown"
					size={18}
				/>

				{/* Lista ligger alltid i DOM-en, ellers peker aria-controls på et
				    element som ikke finnes. Skjult med hidden, ikke fjernet. */}
				<ul
					aria-label={label}
					// scroll-py-1.5 speiler p-1.5. scrollIntoView flukter mot rullefeltets
					// kant, ikke mot innholdskanten, så uten scroll-padding havner siste
					// rad klistret inntil bunnen og får hjørnene klippet av rounded-12.
					className={`${surface} max-h-56 scroll-py-1.5 overflow-y-auto p-1.5`}
					hidden={!showList}
					id={listId}
					// Holder fokus i inputen når man klikker et alternativ. Uten dette
					// faller fokus til <body> og feltet lukkes før klikket lander.
					onMouseDown={(event) => event.preventDefault()}
					ref={listRef}
					// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: ul med role="listbox" er selve APG-mønsteret for combobox. Biome foreslår <select>, som ikke kan filtreres.
					role="listbox"
				>
					{matches.map((option, index) => (
						// biome-ignore lint/a11y/useFocusableInteractive: alternativene skal IKKE være fokuserbare. Fokus blir i inputen, og uthevingen styres av aria-activedescendant.
						// biome-ignore lint/a11y/useKeyWithClickEvents: tastaturet håndteres på inputen, der fokus faktisk er. Et alternativ får aldri DOM-fokus.
						<li
							aria-selected={index === activeIndex}
							className={[
								"flex cursor-pointer items-center justify-between gap-2 rounded-8 px-2.5 py-2 text-small",
								index === activeIndex ? "bg-fill-hover" : "",
								option.value === selected ? "font-medium text-text-brand" : "text-text-strong",
							]
								.filter(Boolean)
								.join(" ")}
							id={`${base}-option-${index}`}
							key={option.value}
							onClick={() => select(option)}
							// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: li med role="option" hører til listboxen over.
							role="option"
						>
							{option.label}
							{option.value === selected && (
								<Icon className="text-icon-brand" name="Check" size={16} />
							)}
						</li>
					))}
				</ul>

				{open && matches.length === 0 && (
					// px-4/py-3.5 = ul-ens p-1.5 pluss radens px-2.5/py-2. Tomteksten
					// står da nøyaktig der et alternativ ville stått, og panelet får
					// samme høyde som en liste med én rad.
					<p className={`${surface} px-4 py-3.5 text-small text-text-weak`}>{emptyText}</p>
				)}
			</div>

			{supportingText && (
				<p className="text-small text-text-weak" id={helpId}>
					{supportingText}
				</p>
			)}
			{error && (
				<p
					className="flex items-center gap-1.5 text-small text-text-error"
					id={errorId}
					role="alert"
				>
					<Icon name="CircleAlert" size={16} />
					{error}
				</p>
			)}

			{/* Antall treff finnes bare visuelt ellers. Skjermleseren flytter ikke
			    fokus til lista, så den må få tallet servert. */}
			<div aria-live="polite" className="sr-only" role="status">
				{status}
			</div>

			{name && <input name={name} type="hidden" value={selected} />}
		</div>
	);
}
