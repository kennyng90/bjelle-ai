import {
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from "react";

export interface UseModalDialogOptions {
	open: boolean;
	onClose: () => void;
	closeOnBackdropClick: boolean;
}

export interface UseModalDialog {
	/** Settes på <dialog>-elementet. */
	dialogRef: RefObject<HTMLDialogElement | null>;
	/** Settes på <dialog>-elementet. Lukker på Escape og klikk på bakteppet. */
	dialogHandlers: {
		onKeyDown: (event: ReactKeyboardEvent<HTMLDialogElement>) => void;
		onMouseDown: (event: ReactMouseEvent<HTMLDialogElement>) => void;
		onClick: (event: ReactMouseEvent<HTMLDialogElement>) => void;
	};
	/** Settes på det rullbare innholdsfeltet. */
	scrollRef: RefObject<HTMLDivElement | null>;
	/** Om innholdet faktisk renner over. Styrer både tab-stopp og skillelinjer. */
	canScroll: boolean;
}

/**
 * Delt oppførsel for Modal og Drawer, begge bygget på native <dialog>.
 *
 * Vi lar nettleseren gjøre det den gjør bedre enn håndskrevet kode:
 * `showModal()` gir fokusfelle, inert bakgrunn, topplagsrendering og Escape.
 * Det som gjenstår - og som denne kroken eier - er å holde DOM-en i takt med
 * `open`, gi fokus tilbake til utløseren, låse rullingen bak dialogen og
 * gjøre bakteppet klikkbart.
 *
 * Ingenting her rører DOM utenfor en effekt, så modulen er trygg å SSR-e.
 */
export function useModalDialog({
	open,
	onClose,
	closeOnBackdropClick,
}: UseModalDialogOptions): UseModalDialog {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const [canScroll, setCanScroll] = useState(false);

	// Effekten under skal kjøre på `open` alene. Tok den med onClose, ville en
	// ny funksjonsreferanse per render lukket og åpnet dialogen på nytt - med
	// fokushopp og ny inn-animasjon hver gang.
	const onCloseRef = useRef(onClose);
	useEffect(() => {
		onCloseRef.current = onClose;
	});

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog || !open) return;

		// Leses før showModal flytter fokus. React flytter ikke fokus når det
		// commiter, så dette er fortsatt elementet brukeren åpnet dialogen fra.
		const trigger = document.activeElement as HTMLElement | null;

		dialog.showModal();
		// showModal fokuserer autofocus-elementet, ellers første fokuserbare
		// element, ellers dialogen selv. Nettet under fanger tilfellet der
		// dialogen ikke er fokuserbar av seg selv.
		if (!dialog.contains(document.activeElement)) dialog.focus();

		// Lukkeforespørsler som ikke er Escape - Android-tilbakeknappen, en
		// close watcher fra nettleseren. Escape tas i onKeyDown lenger nede.
		const cancel = (event: Event) => {
			event.preventDefault();
			onCloseRef.current();
		};
		dialog.addEventListener("cancel", cancel);

		const unlock = lockScroll();

		return () => {
			dialog.removeEventListener("cancel", cancel);
			unlock();
			if (dialog.open) dialog.close();

			// Chrome gir fokus tilbake selv etter close(), men ikke når dialogen
			// forsvinner fra DOM mens den står åpen. Vi rører ikke fokus hvis
			// appen allerede har flyttet det et bevisst sted.
			const active = document.activeElement;
			const focusIsHomeless =
				active === null || active === document.body || dialog.contains(active);
			if (trigger?.isConnected && focusIsHomeless) trigger.focus();
		};
	}, [open]);

	// Et rulleområde uten fokuserbart innhold må kunne nås med tastaturet, men
	// bare når det faktisk ruller - ellers blir det et tomt stopp i tab-rekka.
	useEffect(() => {
		const area = scrollRef.current;
		if (!area || !open) {
			setCanScroll(false);
			return;
		}

		const measure = () => setCanScroll(area.scrollHeight - area.clientHeight > 1);
		measure();

		const observer = new ResizeObserver(measure);
		observer.observe(area);
		// Innholdet kan vokse uten at rammen endrer størrelse.
		for (const child of area.children) observer.observe(child);
		return () => observer.disconnect();
	}, [open]);

	const pressedOnBackdrop = useRef(false);

	return {
		dialogRef,
		scrollRef,
		canScroll,
		dialogHandlers: {
			// Escape håndteres her og ikke bare gjennom nettleserens `cancel`:
			// close request kommer kun av ekte tastetrykk, så en syntetisk
			// Escape i en test ville ikke lukket noe. preventDefault stopper
			// samtidig nettleseren fra å lukke dialogen bak ryggen på `open`,
			// og med det uteblir `cancel` - onClose kalles nøyaktig én gang.
			// defaultPrevented respekteres, så et nedtrekk inni dialogen kan
			// spise sin egen Escape uten at hele dialogen lukkes.
			onKeyDown: (event) => {
				if (event.key !== "Escape" || event.defaultPrevented) return;
				event.preventDefault();
				onClose();
			},
			onMouseDown: (event) => {
				pressedOnBackdrop.current = event.target === dialogRef.current;
			},
			onClick: (event) => {
				// Både trykk og slipp må treffe bakteppet. Ellers lukker en
				// tekstmarkering som starter i panelet og slipper utenfor det.
				const onBackdrop = pressedOnBackdrop.current && event.target === dialogRef.current;
				pressedOnBackdrop.current = false;
				if (onBackdrop && closeOnBackdropClick) onClose();
			},
		},
	};
}

/**
 * Sperrer rulling bak dialogen. showModal() gjør bakgrunnen inert, men den
 * ruller fortsatt. Returnerer en funksjon som gir siden tilbake.
 */
function lockScroll(): () => void {
	const { body } = document;
	const previousOverflow = body.style.overflow;
	const previousPadding = body.style.paddingRight;

	// Rullefeltet forsvinner når overflow låses. Uten kompensasjon hopper hele
	// siden sidelengs i det dialogen åpner.
	const scrollbar = window.innerWidth - document.documentElement.clientWidth;
	if (scrollbar > 0) {
		const current = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
		body.style.paddingRight = `${current + scrollbar}px`;
	}
	body.style.overflow = "hidden";

	return () => {
		body.style.overflow = previousOverflow;
		body.style.paddingRight = previousPadding;
	};
}
