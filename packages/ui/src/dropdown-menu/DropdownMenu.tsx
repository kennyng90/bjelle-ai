import {
	type FocusEvent,
	type HTMLAttributes,
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { Button, type ButtonProps } from "../button/Button.tsx";
import { Icon, type IconName } from "../icon/Icon.tsx";

export interface DropdownMenuItem {
	/** Synlig tekst. Også nøkkelen for hurtigsøk med bokstavtaster. */
	label: string;
	icon?: IconName;
	/** Vises høyrejustert, for eksempel «⌘E». Kun opplysning - binder ingen tast. */
	shortcut?: string;
	/** Destruktiv handling. Får rød tekst og rødt ikon. */
	danger?: boolean;
	/**
	 * Kalles når valget aktiveres, med mus eller med Enter/mellomrom. Menyen
	 * lukkes og fokus går tilbake til utløseren før dette kjøres.
	 */
	onSelect?: () => void;
}

export interface DropdownMenuDivider {
	divider: true;
}

export type DropdownMenuEntry = DropdownMenuItem | DropdownMenuDivider;

export interface DropdownMenuProps
	extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
	/**
	 * Innholdet i utløseren, ikke et ferdig element. Komponenten eier `<button>`-en
	 * selv - kilden pakket en hvilken som helst node i en klikkbar `<span>`, som
	 * ga en utløser uten tastaturstøtte og nøstede knapper.
	 */
	trigger: ReactNode;
	items: DropdownMenuEntry[];
	/** Hvilken kant menyen flukter med. */
	align?: "start" | "end";
	/** Tilgjengelig navn på menyen. Standard er utløserens navn. */
	label?: string;
	/** Kontrollert åpen-tilstand. Utelat for at komponenten skal styre den selv. */
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	/** Sendes videre til utløserknappen, for variant, størrelse og ikoner. */
	triggerProps?: Omit<
		ButtonProps,
		"aria-expanded" | "aria-haspopup" | "children" | "onClick" | "onKeyDown"
	>;
	/** Vises som et deaktivert valg når `items` er tom. */
	emptyLabel?: string;
}

const itemBase =
	"flex w-full items-center gap-2.5 rounded-8 px-2.5 py-2.5 text-left text-small font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus";

function isDivider(entry: DropdownMenuEntry): entry is DropdownMenuDivider {
	return "divider" in entry;
}

export function DropdownMenu({
	trigger,
	items,
	align = "start",
	label,
	open: openProp,
	defaultOpen = false,
	onOpenChange,
	triggerProps,
	emptyLabel = "Ingen valg",
	className,
	...props
}: DropdownMenuProps) {
	const triggerId = useId();
	const rootRef = useRef<HTMLDivElement>(null);
	const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const hasMounted = useRef(false);
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const [activeIndex, setActiveIndex] = useState(0);

	const open = openProp ?? uncontrolledOpen;
	const options = items.filter((entry): entry is DropdownMenuItem => !isDivider(entry));
	const count = Math.max(options.length, 1); // tom meny har ett deaktivert valg

	function setOpen(next: boolean) {
		if (openProp === undefined) setUncontrolledOpen(next);
		onOpenChange?.(next);
	}

	/**
	 * Utløseren hentes med id og ikke med ref: `Button` er en vanlig
	 * funksjonskomponent uten ref-prop, og å legge en ref på en wrapper for så å
	 * lete etter riktig barn er mer skjørt enn å slå opp en id vi eier selv.
	 */
	function focusTrigger() {
		document.getElementById(triggerId)?.focus();
	}

	// Fokus følger activeIndex så lenge menyen er åpen. Hopper over første
	// render, ellers stjeler en meny med defaultOpen fokus fra siden.
	useEffect(() => {
		if (!hasMounted.current) {
			hasMounted.current = true;
			return;
		}
		if (open) itemRefs.current[activeIndex]?.focus();
	}, [open, activeIndex]);

	// Klikk utenfor lukker. Lytteren finnes bare mens menyen er åpen, og
	// registreres i en effekt slik at komponenten kan SSR-rendres.
	useEffect(() => {
		if (!open) return;
		function handleOutsidePress(event: MouseEvent) {
			if (rootRef.current?.contains(event.target as Node)) return;
			if (openProp === undefined) setUncontrolledOpen(false);
			onOpenChange?.(false);
		}
		document.addEventListener("mousedown", handleOutsidePress);
		return () => document.removeEventListener("mousedown", handleOutsidePress);
	}, [open, openProp, onOpenChange]);

	function openMenu(from: "first" | "last") {
		setActiveIndex(from === "first" ? 0 : count - 1);
		setOpen(true);
	}

	function closeAndReturnFocus() {
		setOpen(false);
		focusTrigger();
	}

	function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			openMenu("first");
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			openMenu("last");
		}
	}

	function handleFocusOut(event: FocusEvent<HTMLDivElement>) {
		const newTarget = event.relatedTarget;
		// Fokus som bare flytter seg mellom valgene, eller tilbake til utløseren,
		// skal ikke lukke noe.
		if (newTarget instanceof Node && rootRef.current?.contains(newTarget)) return;
		setOpen(false);
	}

	function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				setActiveIndex((i) => (i + 1) % count);
				return;
			case "ArrowUp":
				event.preventDefault();
				setActiveIndex((i) => (i - 1 + count) % count);
				return;
			case "Home":
				event.preventDefault();
				setActiveIndex(0);
				return;
			case "End":
				event.preventDefault();
				setActiveIndex(count - 1);
				return;
			case "Escape":
				event.preventDefault();
				closeAndReturnFocus();
				return;
			// Tab håndteres ikke her. Lukker vi menyen i keydown, rives valget ut av
			// DOM-en før nettleseren rekker å regne ut neste element i
			// tabrekkefølgen, og fokus faller ned på <body>. I stedet lar vi Tab
			// flytte fokus fritt og lukker på focusout under.
			default:
				break;
		}

		// Hurtigsøk: hopp til neste valg som begynner på bokstaven du trykker.
		if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) return;
		const char = event.key.toLowerCase();
		if (char === " ") return;
		for (let step = 1; step <= options.length; step++) {
			const i = (activeIndex + step) % options.length;
			if (options[i]?.label.toLowerCase().startsWith(char)) {
				event.preventDefault();
				setActiveIndex(i);
				return;
			}
		}
	}

	return (
		<div
			className={["relative inline-flex", className].filter(Boolean).join(" ")}
			ref={rootRef}
			{...props}
		>
			{/* Spredningen ligger foran de kritiske attributtene med vilje: en
			    konsument skal kunne bytte variant og ikoner, men ikke skru av
			    aria-expanded eller kapre onClick. */}
			<Button
				trailingIcon="ChevronDown"
				variant="secondary"
				{...triggerProps}
				aria-expanded={open}
				aria-haspopup="menu"
				id={triggerId}
				onClick={() => (open ? setOpen(false) : openMenu("first"))}
				onKeyDown={handleTriggerKeyDown}
			>
				{trigger}
			</Button>

			{/* Menyen finnes ikke i DOM-en når den er lukket. */}
			{open && (
				<div
					aria-label={label}
					aria-labelledby={label === undefined ? triggerId : undefined}
					className={[
						"absolute top-full z-50 mt-1.5 min-w-48 rounded-12 border border-stroke-weak bg-background-overlay p-1.5 shadow-lg",
						align === "end" ? "end-0" : "start-0",
					].join(" ")}
					onBlur={handleFocusOut}
					onKeyDown={handleMenuKeyDown}
					role="menu"
				>
					{options.length === 0 ? (
						<button
							aria-disabled="true"
							className={`${itemBase} cursor-default text-text-weak`}
							ref={(node) => {
								itemRefs.current[0] = node;
							}}
							role="menuitem"
							tabIndex={-1}
							type="button"
						>
							{emptyLabel}
						</button>
					) : (
						items.map((entry, i) => {
							// Skillelinjer har ingen identitet, så posisjonen er nøkkelen.
							if (isDivider(entry)) {
								// -mx-1.5 spiser opp kortets egen polstring, så streken går
								// helt ut til kanten. Med mx-1 stoppet den fire piksler fra
								// kanten og seks fra teksten - verken flukt eller innrykk.
								return (
									<hr className="-mx-1.5 my-1.5 border-t border-stroke-weak" key={`divider-${i}`} />
								);
							}

							const index = options.indexOf(entry);
							return (
								<button
									className={[
										itemBase,
										entry.danger
											? "text-text-error hover:bg-fill-error-weak"
											: "text-text-strong hover:bg-fill-hover",
									].join(" ")}
									key={entry.label}
									onClick={() => {
										closeAndReturnFocus();
										entry.onSelect?.();
									}}
									ref={(node) => {
										itemRefs.current[index] = node;
									}}
									role="menuitem"
									tabIndex={-1}
									type="button"
								>
									{entry.icon && (
										<Icon
											className={entry.danger ? "text-icon-error" : "text-icon-neutral"}
											name={entry.icon}
											size={18}
										/>
									)}
									<span className="flex-1">{entry.label}</span>
									{entry.shortcut && (
										<span className="ml-4 text-tiny text-text-weak">{entry.shortcut}</span>
									)}
								</button>
							);
						})
					)}
				</div>
			)}
		</div>
	);
}
