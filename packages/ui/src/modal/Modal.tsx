import { type HTMLAttributes, type ReactNode, useId } from "react";
import { DialogCloseButton } from "../dialog/DialogCloseButton.tsx";
import { useModalDialog } from "../dialog/useModalDialog.ts";

export type ModalSize = "sm" | "md" | "lg";

export interface ModalProps extends Omit<HTMLAttributes<HTMLDialogElement>, "title" | "onClose"> {
	/** Modal er kontrollert: appen eier tilstanden, ikke komponenten. */
	open: boolean;
	/**
	 * Kalles når brukeren ber om å lukke - Escape, lukkeknappen eller klikk på
	 * bakteppet. Sett `open` til false her. Uten en vei ut ville dialogen vært
	 * en tastaturfelle, derfor er den påkrevd.
	 */
	onClose: () => void;
	/** Gir dialogen dens tilgjengelige navn. Uten tittel: send `aria-label`. */
	title?: ReactNode;
	description?: ReactNode;
	/** Knapperad i bunnen. Står fast når innholdet ruller. */
	footer?: ReactNode;
	size?: ModalSize;
	showCloseButton?: boolean;
	/** Legges på panelet, ikke på <dialog>-laget som dekker viewporten. */
	className?: string;
	/** Av for destruktive bekreftelser, så et uhellsklikk ikke avbryter. */
	closeOnBackdropClick?: boolean;
}

/*
 * Bygget på native <dialog> + showModal(). Det gir fokusfelle, inert bakgrunn,
 * Escape og topplagsrendering fra nettleseren - og implisitt role="dialog"
 * med aria-modal="true". Håndskrevne varianter av de fire tar vi ikke.
 *
 * Dialogen dekker hele viewporten og er selv gjennomsiktig: panelet ligger
 * inni. Da har bakteppeklikk et treffområde vi kan kjenne igjen på
 * event.target, mens ::backdrop står for selve mørkleggingen.
 */
const dialogBase = [
	// `group`: panelet inni leser dialogens open-tilstand for å vite om det skal
	// stå framme eller være på vei bort. Se `panelBase`.
	"group fixed inset-0 m-0 h-full max-h-none w-full max-w-none",
	// hidden/open:flex, ikke bare flex: en klasse med display ville slått
	// nettleserens `dialog:not([open]) { display: none }`, og en lukket dialog
	// ville blitt liggende usynlig over siden - og i tilgjengelighetstreet.
	"hidden items-center justify-center overflow-hidden p-6 open:flex",
	"bg-transparent font-sans",
	// `display` og `overlay` er diskrete egenskaper: de hopper mellom to verdier
	// uten mellomsteg, og uten `allow-discrete` skjer begge hoppene i samme
	// frame som close(). Da er dialogen borte fra skjermen og ut av topplaget
	// før panelet har rukket å tone ned. Med `transition-discrete` holder
	// nettleseren begge på åpen verdi til overgangen er ferdig.
	"transition-[display,overlay] transition-discrete",
	"backdrop:bg-fill-overlay backdrop:backdrop-blur-[2px]",
	// Samme to diskrete egenskapene på bakteppet: ::backdrop finnes kun mens
	// dialogen er i topplaget, så uten dem slukner mørkleggingen momentant.
	"backdrop:transition-[opacity,display,overlay] backdrop:transition-discrete",
	// Inn: fra gjennomsiktig ved første frame. Ut: til gjennomsiktig når
	// [open] faller bort.
	"starting:backdrop:opacity-0 not-open:backdrop:opacity-0",
	"motion-reduce:transition-none motion-reduce:backdrop:transition-none",
].join(" ");

/*
 * Bevegelsen står tre ganger fordi de tre tilstandene er tre ulike CSS-regler:
 *
 * - `scale-95 opacity-0` - hvilestillingen. Den gjelder når `[open]` ikke står
 *   der, altså også hele veien ut igjen, og er derfor det som gir utgangen.
 * - `group-open:*` - slik panelet står mens dialogen er åpen.
 * - `starting:group-open:*` - hva inngangen starter fra. Hvilestillingen duger
 *   ikke: panelets første frame er også dets første rendering, siden forelderen
 *   kom fra `display: none`, og da finnes det ingen forrige verdi å gå ut fra.
 */
const panelBase = [
	"relative flex max-h-full w-full flex-col overflow-hidden",
	"rounded-16 bg-background-overlay shadow-xl",
	"transition-[opacity,scale] motion-reduce:transition-none",
	"scale-95 opacity-0 group-open:scale-100 group-open:opacity-100",
	"starting:group-open:scale-95 starting:group-open:opacity-0",
].join(" ");

// Bredder fra Practical UI. Maksbredder, ikke faste: på små skjermer krymper
// panelet med viewporten.
const sizes: Record<ModalSize, string> = {
	sm: "max-w-[400px]",
	md: "max-w-[520px]",
	lg: "max-w-[680px]",
};

/**
 * Modal - sentrert dialog over et bakteppe.
 *
 * Bygget på native `<dialog>` og `showModal()`. Fokusfelle, inert bakgrunn,
 * Escape og topplagsrendering kommer fra nettleseren i stedet for fra kode
 * her, og elementet får implisitt `role="dialog"` med `aria-modal="true"`.
 *
 * I `apps/web` må øya hydreres med `client:load`. Uten client-direktiv blir
 * dialogen statisk HTML og `showModal()` kjøres aldri. `client:visible`
 * hjelper ikke: en lukket dialog er `display: none` og krysser aldri
 * synsranden.
 */
export function Modal({
	open,
	onClose,
	title,
	description,
	footer,
	size = "md",
	showCloseButton = true,
	closeOnBackdropClick = true,
	className,
	children,
	"aria-labelledby": ariaLabelledBy,
	"aria-describedby": ariaDescribedBy,
	...rest
}: ModalProps) {
	const id = useId();
	const titleId = `${id}-title`;
	const descriptionId = `${id}-description`;
	const { dialogRef, dialogHandlers, scrollRef, canScroll } = useModalDialog({
		open,
		onClose,
		closeOnBackdropClick,
	});

	// Toppfeltet finnes bare når det står tekst i det. En lukkeknapp alene får
	// ikke en egen rad - da ville dialogen fått en tom stripe over innholdet.
	const hasHeader = title != null || description != null;

	return (
		// rest spres først med vilje: en konsument skal ikke kunne overskrive
		// bakteppehåndtereren eller ref-en og bryte dialogen.
		<dialog
			{...rest}
			aria-describedby={ariaDescribedBy ?? (description != null ? descriptionId : undefined)}
			aria-labelledby={ariaLabelledBy ?? (title != null ? titleId : undefined)}
			className={dialogBase}
			onClick={dialogHandlers.onClick}
			onKeyDown={dialogHandlers.onKeyDown}
			onMouseDown={dialogHandlers.onMouseDown}
			ref={dialogRef}
			// Fallback for dialoger uten fokuserbart innhold: da skal fokus
			// lande på dialogen selv, ikke bli stående igjen bak den.
			tabIndex={-1}
		>
			<div className={[panelBase, sizes[size], className].filter(Boolean).join(" ")}>
				{showCloseButton && !hasHeader && (
					// Uten tittel legger knappen seg i hjørnet, midt på første
					// tekstlinje i innholdet under. top-6/right-6, ikke top-4/right-4:
					// knappen har -my-2 -mr-2 for flytoppsettet i toppfeltet, og de
					// dro den åtte piksler opp og åtte til høyre her - av linja og
					// nærmere kanten enn i varianten med tittel.
					<div className="absolute top-6 right-6 z-10">
						<DialogCloseButton onClick={onClose} />
					</div>
				)}

				{hasHeader && (
					<div
						className={[
							"flex shrink-0 gap-4 px-6 pt-6",
							// Én linje tittel står optisk midt på lukkeknappen. Med
							// beskrivelse blir toppen en blokk, og knappen hører hjemme
							// i hjørnet.
							description != null ? "items-start" : "items-center",
							// Luft over hårstreken når innholdet ruller. Uten den lå
							// streken klistret inntil beskrivelsen, mens den nedre hadde
							// 16 px ned til knapperaden.
							canScroll && "pb-4",
						]
							.filter(Boolean)
							.join(" ")}
					>
						<div className="flex flex-1 flex-col gap-1">
							{title != null && (
								<h2 className="text-h4 font-strong text-text-strong" id={titleId}>
									{title}
								</h2>
							)}
							{description != null && (
								<p className="text-body text-text-weak" id={descriptionId}>
									{description}
								</p>
							)}
						</div>
						{/* h-7 er tittelens linjehøyde. Boksen sentrerer knappen på den
						    linja i stedet for på toppen av blokken, så X-en står optisk
						    på tittelen også når det står en beskrivelse under. */}
						{showCloseButton && (
							<div className="flex h-7 shrink-0 items-center">
								<DialogCloseButton onClick={onClose} />
							</div>
						)}
					</div>
				)}

				{children != null && (
					<div
						className={[
							"min-h-0 flex-1 overflow-y-auto overscroll-contain pl-6 text-body text-text-strong",
							hasHeader ? "pt-4" : "pt-6",
							footer != null ? "pb-4" : "pb-6",
							// Plass til lukkeknappen i hjørnet når toppfeltet mangler.
							showCloseButton && !hasHeader ? "pr-14" : "pr-6",
							// Hårstrek når innholdet renner over, ellers ville teksten
							// blitt klippet rett mot tittelen uten at noe forklarte hvorfor.
							canScroll && "border-stroke-weak border-y",
							// Innoverrettet ring: en vanlig fokusring ville blitt klippet
							// av overflow-hidden på panelet.
							"focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-stroke-focus",
						]
							.filter(Boolean)
							.join(" ")}
						ref={scrollRef}
						tabIndex={canScroll ? 0 : undefined}
					>
						{children}
					</div>
				)}

				{footer != null && (
					<div className="flex shrink-0 flex-wrap items-center justify-end gap-3 px-6 pt-4 pb-6">
						{footer}
					</div>
				)}
			</div>
		</dialog>
	);
}
