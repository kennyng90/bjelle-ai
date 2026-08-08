import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { Icon } from "../icon/Icon.tsx";

export interface DatePickerProps {
	/** Synlig overskrift over kalenderen. Inngår i rutenettets navn. */
	label?: string;
	/** Styrt modus. Utelat for å la komponenten holde valget selv. */
	value?: Date | null;
	defaultValue?: Date | null;
	/** Tidligste valgbare dag. Dager før denne kan fokuseres, men ikke velges. */
	min?: Date;
	max?: Date;
	supportingText?: string;
	onChange?: (date: Date) => void;
	id?: string;
	className?: string;
}

// Hardkodet norsk. Intl gir riktige navn, men ulik ICU-data mellom Node og
// nettleser gjør utskriften avhengig av hvor koden kjører - dårlig bytte for
// tolv strenger i et norsk designsystem.
const MONTHS = [
	"januar",
	"februar",
	"mars",
	"april",
	"mai",
	"juni",
	"juli",
	"august",
	"september",
	"oktober",
	"november",
	"desember",
];

const WEEKDAYS = [
	{ short: "ma", long: "mandag" },
	{ short: "ti", long: "tirsdag" },
	{ short: "on", long: "onsdag" },
	{ short: "to", long: "torsdag" },
	{ short: "fr", long: "fredag" },
	{ short: "lø", long: "lørdag" },
	{ short: "sø", long: "søndag" },
];

function startOfDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function key(date: Date) {
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function addDays(date: Date, count: number) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

/** Klemmer dagen inn i måneden: 31. januar pluss én måned blir 28. februar. */
function addMonths(date: Date, count: number) {
	const first = new Date(date.getFullYear(), date.getMonth() + count, 1);
	const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
	return new Date(first.getFullYear(), first.getMonth(), Math.min(date.getDate(), lastDay));
}

/** Mandag = 0. getDay() gir søndag = 0, og norske kalendere starter på mandag. */
function weekday(date: Date) {
	return (date.getDay() + 6) % 7;
}

function buildWeeks(year: number, month: number) {
	const dayCount = new Date(year, month + 1, 0).getDate();
	const cells: (number | null)[] = [];
	for (let i = 0; i < weekday(new Date(year, month, 1)); i += 1) cells.push(null);
	for (let day = 1; day <= dayCount; day += 1) cells.push(day);
	while (cells.length % 7 !== 0) cells.push(null);

	const weeks: (number | null)[][] = [];
	for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
	return weeks;
}

function format(date: Date) {
	return `${date.getDate()}. ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

const navButton = [
	"inline-flex size-8 shrink-0 items-center justify-center rounded-8 text-icon-neutral",
	"transition-[background-color,color] hover:bg-fill-hover hover:text-icon-strong",
	"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
].join(" ");

/**
 * Kalender med valg av én dato, montert rett i siden.
 *
 * Dette er ikke et datofelt. Skal brukeren bare skrive inn en dato i et skjema,
 * er `<input type="date">` et bedre valg: nettleseren gir da lokalt format,
 * mobiltastatur, tastaturnavigasjon og skjermleserstøtte gratis, og vi slipper
 * å vedlikeholde noe av det. Denne komponenten er for flatene der kalenderen
 * skal stå åpen og synlig - booking, planlegging, ledige datoer.
 *
 * Rutenettet er en ekte `<table role="grid">`, ikke et div-rutenett. Da får
 * skjermleseren kolonneoverskriftene med på kjøpet, og «torsdag, uke-kolonne»
 * fungerer i tabellmodus.
 *
 * Navigering følger APG: piltaster dag for dag og uke for uke, Home og End til
 * start og slutt av uka, PageUp og PageDown måned for måned, Shift for år.
 * Bare den fokuserte dagen ligger i tabrekkefølgen (roving tabindex), så Tab
 * hopper forbi kalenderen i stedet for gjennom 31 knapper.
 *
 * Dager utenfor min/max får `aria-disabled` og ikke `disabled`. En `disabled`
 * knapp kan ikke fokuseres, og da låser piltastnavigasjonen seg mot grensa.
 *
 * SSR-trygg: ingen DOM-oppslag under render. I `apps/web` er den en øy og
 * trenger `client:load` eller `client:visible`.
 */
export function DatePicker({
	label,
	value,
	defaultValue,
	min,
	max,
	supportingText,
	onChange,
	id,
	className,
}: DatePickerProps) {
	const base = useId();
	const rootId = id ?? `${base}-calendar`;
	const labelId = `${base}-label`;
	const monthId = `${base}-month`;
	const helpId = `${base}-help`;

	const [today] = useState(() => startOfDay(new Date()));
	const controlled = value !== undefined;
	const [internalSelected, setInternalSelected] = useState<Date | null>(
		defaultValue ? startOfDay(defaultValue) : null,
	);
	const selected = controlled ? (value ? startOfDay(value) : null) : internalSelected;

	// Visningen følger den fokuserte dagen. Ett stykke tilstand i stedet for to
	// som kan komme i utakt.
	const [focused, setFocused] = useState<Date>(() =>
		startOfDay(value ?? defaultValue ?? new Date()),
	);
	const [announcement, setAnnouncement] = useState("");
	const shouldFocus = useRef(false);
	const gridRef = useRef<HTMLTableElement>(null);

	useEffect(() => {
		if (!shouldFocus.current) return;
		shouldFocus.current = false;
		gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${key(focused)}"]`)?.focus();
	}, [focused]);

	const year = focused.getFullYear();
	const month = focused.getMonth();
	const monthName = MONTHS[month] ?? "";
	const heading = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${year}`;

	function outOfBounds(date: Date) {
		if (min && date < startOfDay(min)) return true;
		if (max && date > startOfDay(max)) return true;
		return false;
	}

	function moveFocus(date: Date) {
		shouldFocus.current = true;
		setFocused(date);
	}

	function select(date: Date) {
		if (outOfBounds(date)) return;
		if (!controlled) setInternalSelected(date);
		setFocused(date);
		onChange?.(date);
		// Fargen på den valgte dagen sier ingenting til en skjermleser.
		setAnnouncement(`Valgt dato: ${format(date)}`);
	}

	function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
		const move: Record<string, () => Date> = {
			ArrowLeft: () => addDays(focused, -1),
			ArrowRight: () => addDays(focused, 1),
			ArrowUp: () => addDays(focused, -7),
			ArrowDown: () => addDays(focused, 7),
			Home: () => addDays(focused, -weekday(focused)),
			End: () => addDays(focused, 6 - weekday(focused)),
			PageUp: () => addMonths(focused, event.shiftKey ? -12 : -1),
			PageDown: () => addMonths(focused, event.shiftKey ? 12 : 1),
		};

		const next = move[event.key];
		if (!next) return;
		event.preventDefault();
		moveFocus(next());
	}

	const gridName = [label ? labelId : null, monthId].filter(Boolean).join(" ");

	return (
		<div
			className={[
				// Rutenettet setter bredden. w-0 min-w-full på tekstene under holder
				// dem utenfor w-fit-regnestykket: uten det vokser kortet med en lang
				// hjelpetekst, og da flytter månedspilene seg utover mens kolonnene
				// blir stående - pila til høyre flukter ikke lenger med søndagsspalten.
				"w-fit rounded-16 border border-stroke-weak bg-background-overlay p-4 font-sans shadow-lg",
				className,
			]
				.filter(Boolean)
				.join(" ")}
			id={rootId}
		>
			{label && (
				<p className="mb-3 w-0 min-w-full text-small font-strong text-text-strong" id={labelId}>
					{label}
				</p>
			)}

			<div className="mb-3 flex items-center justify-between gap-2">
				<button
					aria-label="Forrige måned"
					className={navButton}
					// Flytter ikke fokus: den som blar med musa skal kunne klikke
					// videre uten å lete opp knappen på nytt.
					onClick={() => setFocused(addMonths(focused, -1))}
					type="button"
				>
					<Icon name="ChevronLeft" size={18} />
				</button>
				<span aria-live="polite" className="text-small font-strong text-text-strong" id={monthId}>
					{heading}
				</span>
				<button
					aria-label="Neste måned"
					className={navButton}
					onClick={() => setFocused(addMonths(focused, 1))}
					type="button"
				>
					<Icon name="ChevronRight" size={18} />
				</button>
			</div>

			<table
				aria-labelledby={gridName}
				className="border-separate border-spacing-0"
				ref={gridRef}
				// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: role="grid" på en ekte tabell er nettopp mønsteret APG foreskriver for kalendere. Erstatningen biome foreslår finnes ikke.
				role="grid"
			>
				<thead>
					<tr>
						{WEEKDAYS.map((day) => (
							<th
								abbr={day.long}
								className="size-9 pb-1 text-center text-tiny font-strong text-text-weak"
								key={day.short}
								scope="col"
							>
								{day.short}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{buildWeeks(year, month).map((week) => (
						<tr key={week.map((d) => d ?? "-").join()}>
							{week.map((day, column) => {
								if (day === null) {
									// Tom celle. Rader i et rutenett må ha like mange
									// kolonner, ellers blir tabellnavigasjonen skjev.
									return (
										// biome-ignore lint/a11y/useFocusableInteractive: cellene er ikke fokuserbare. Det er dagknappen inni som bærer roving tabindex, slik APG beskriver for kalenderrutenett.
										<td
											className="p-0.5"
											key={`empty-${WEEKDAYS[column]?.short}`}
											// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: td i en role="grid"-tabell ER en gridcell. Rollen står eksplisitt fordi verktøy som ikke løser rollen fra tabellkonteksten ellers ser en vanlig celle.
											role="gridcell"
										/>
									);
								}

								const date = new Date(year, month, day);
								const isSelected = selected !== null && key(selected) === key(date);
								const isToday = key(today) === key(date);
								const disabled = outOfBounds(date);

								return (
									// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: se kommentaren over den tomme cella.
									// biome-ignore lint/a11y/useFocusableInteractive: se kommentaren over den tomme cella.
									<td aria-selected={isSelected} className="p-0.5" key={day} role="gridcell">
										<button
											aria-current={isToday ? "date" : undefined}
											aria-disabled={disabled || undefined}
											aria-label={format(date)}
											className={[
												"flex size-8 items-center justify-center rounded-8 text-small",
												// transition-colors ville tatt med outline-color, og fokusringen
												// skal stå der med en gang.
												"transition-[background-color,color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
												isSelected && "bg-fill-brand-strong font-strong text-text-on-strong",
												!isSelected &&
													isToday &&
													"font-strong text-text-brand ring-1 ring-stroke-brand-strong ring-inset",
												!isSelected && !isToday && !disabled && "text-text-strong",
												// Gjennomstreking, ikke bare lysere tekst: en sperret dag skiller
												// seg da fra en ledig dag også for den som ikke ser fargeforskjellen.
												disabled &&
													!isSelected &&
													"cursor-not-allowed text-text-disabled line-through",
												!isSelected && !disabled && "hover:bg-fill-hover",
											]
												.filter(Boolean)
												.join(" ")}
											data-date={key(date)}
											onClick={() => select(date)}
											// Fokus kan komme utenfra: et museklikk på en
											// annen dag, eller kode som kaller focus().
											// Uten denne synkroniseringen regner
											// piltastene videre fra feil dag.
											onFocus={() => {
												if (key(date) !== key(focused)) setFocused(date);
											}}
											onKeyDown={handleKey}
											tabIndex={key(focused) === key(date) ? 0 : -1}
											type="button"
										>
											{day}
										</button>
									</td>
								);
							})}
						</tr>
					))}
				</tbody>
			</table>

			{supportingText && (
				<p className="mt-3 w-0 min-w-full text-small text-text-weak" id={helpId}>
					{supportingText}
				</p>
			)}

			<div aria-live="polite" className="sr-only" role="status">
				{announcement}
			</div>
		</div>
	);
}
