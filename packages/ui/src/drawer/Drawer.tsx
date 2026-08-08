import { type HTMLAttributes, type ReactNode, useId } from "react";
import { DialogCloseButton } from "../dialog/DialogCloseButton.tsx";
import { useModalDialog } from "../dialog/useModalDialog.ts";

export type DrawerSide = "left" | "right" | "top" | "bottom";
export type DrawerSize = "sm" | "md" | "lg";

export interface DrawerProps extends Omit<HTMLAttributes<HTMLDialogElement>, "title" | "onClose"> {
	/** Drawer er kontrollert: appen eier tilstanden, ikke komponenten. */
	open: boolean;
	/**
	 * Kalles når brukeren ber om å lukke - Escape, lukkeknappen eller klikk på
	 * bakteppet. Sett `open` til false her. Uten en vei ut ville skuffen vært
	 * en tastaturfelle, derfor er den påkrevd.
	 */
	onClose: () => void;
	/** Gir skuffen dens tilgjengelige navn. Uten tittel: send `aria-label`. */
	title?: ReactNode;
	/** Knapperad i bunnen. Står fast når innholdet ruller. */
	footer?: ReactNode;
	/** Kanten skuffen glir inn fra. */
	side?: DrawerSide;
	/** Bredde for venstre og høyre, høyde for topp og bunn. */
	size?: DrawerSize;
	showCloseButton?: boolean;
	/** Legges på panelet, ikke på <dialog>-laget som dekker viewporten. */
	className?: string;
	closeOnBackdropClick?: boolean;
}

/*
 * Samme grunnmur som Modal: native <dialog> + showModal() gir fokusfelle,
 * inert bakgrunn, Escape og topplag, og implisitt role="dialog" med
 * aria-modal="true". Forskjellen er at panelet er festet til en kant.
 */
const dialogBase = [
	// `group`: panelet inni leser dialogens open-tilstand for å vite om det skal
	// stå ved kanten eller utenfor den. Se `sides`.
	"group fixed inset-0 m-0 h-full max-h-none w-full max-w-none",
	// hidden/open:flex, ikke bare flex: en klasse med display ville slått
	// nettleserens `dialog:not([open]) { display: none }`, og en lukket skuff
	// ville blitt liggende usynlig over siden - og i tilgjengelighetstreet.
	//
	// `overflow-clip`, ikke `overflow-hidden`: hidden lager en scrollflate selv
	// om rullefeltet er skjult. Panelet står utenfor kanten det første framet
	// (`starting:group-open:translate-*`), og for right/bottom er det overflow i positiv
	// retning - altså 400px scrollbart innhold. showModal() flytter fokus inn i
	// panelet, nettleseren scroller dialogen dit for å vise det fokuserte
	// elementet, og da følger scrollposisjonen animasjonen nedover mens
	// panelet står visuelt stille. Målt: scrollLeft 400→0 i takt med translate,
	// og panelet glir aldri inn. clip lager ingen scrollport, så det kan ikke
	// skje. left/top var upåvirket fordi negativ overflow ikke er scrollbar.
	"hidden overflow-clip open:flex",
	"bg-transparent font-sans",
	// `display` og `overlay` er diskrete egenskaper: de hopper mellom to verdier
	// uten mellomsteg, og uten `allow-discrete` skjer begge hoppene i samme
	// frame som close(). Da er dialogen `display: none` og ute av topplaget før
	// panelet har flyttet seg en piksel - skuffen blir bare borte. Med
	// `transition-discrete` holder nettleseren begge på åpen verdi til
	// overgangen er ferdig, og utglidningen under rekker å spille.
	"transition-[display,overlay] transition-discrete",
	"backdrop:bg-fill-overlay backdrop:backdrop-blur-[2px]",
	// Bakteppet trenger de samme to diskrete egenskapene: ::backdrop finnes kun
	// mens dialogen er i topplaget, så uten dem forsvinner mørkleggingen
	// momentant mens panelet fortsatt glir ut.
	"backdrop:transition-[opacity,display,overlay] backdrop:transition-discrete",
	// Inn: fra gjennomsiktig ved første frame. Ut: til gjennomsiktig når
	// [open] faller bort.
	"starting:backdrop:opacity-0 not-open:backdrop:opacity-0",
	"motion-reduce:transition-none motion-reduce:backdrop:transition-none",
].join(" ");

const panelBase = [
	"relative flex min-h-0 flex-col overflow-hidden bg-background-overlay shadow-xl",
	"transition-[translate] motion-reduce:transition-none",
].join(" ");

/**
 * Per kant: hvor panelet står i viewporten, hvordan det måles, og hvilken vei
 * det glir inn fra. Bevegelsen er en egenskap ved kanten, ikke en egen prop.
 *
 * `motion` sier det samme tre ganger fordi de tre tilstandene er tre ulike
 * CSS-regler, og hver av dem svarer på ett spørsmål:
 *
 * - `-translate-x-full` - hvilestillingen utenfor kanten. Den gjelder når
 *   `[open]` ikke står der, altså også hele veien ut igjen, og er derfor det
 *   som gir utglidningen. Uten den ville panelet stått ved kanten til dialogen
 *   ble `display: none` og bare blitt borte.
 * - `group-open:translate-x-0` - plassen ved kanten mens skuffen er åpen.
 * - `starting:group-open:-translate-x-full` - hva innglidningen starter fra.
 *   Hvilestillingen duger ikke: panelets første frame er også dets første
 *   rendering (forelderen gikk fra `display: none`), og da finnes det ingen
 *   forrige verdi å gå ut fra. `@starting-style` er den verdien.
 *
 * Klassenavnene står med vilje uforkortet i hver gren. Bygget dem opp fra
 * `side` og en akse, ville Tailwinds skanner - som leser kildeteksten, ikke
 * kjøretiden - aldri sett dem, og ingen av reglene hadde blitt generert.
 */
const sides: Record<DrawerSide, { dialog: string; panel: string; motion: string }> = {
	left: {
		dialog: "justify-start",
		panel: "h-full max-w-[90vw]",
		motion: "-translate-x-full group-open:translate-x-0 starting:group-open:-translate-x-full",
	},
	right: {
		dialog: "justify-end",
		panel: "h-full max-w-[90vw]",
		motion: "translate-x-full group-open:translate-x-0 starting:group-open:translate-x-full",
	},
	top: {
		dialog: "flex-col justify-start",
		// Avrundet mot innsiden: kanten mot viewporten står flatt, kanten mot
		// innholdet leses som et ark som er dratt ut.
		panel: "max-h-[90vh] w-full rounded-b-16",
		motion: "-translate-y-full group-open:translate-y-0 starting:group-open:-translate-y-full",
	},
	bottom: {
		dialog: "flex-col justify-end",
		panel: "max-h-[90vh] w-full rounded-t-16",
		motion: "translate-y-full group-open:translate-y-0 starting:group-open:translate-y-full",
	},
};

// Bredder fra Practical UI (400 er kildens standard). Topp og bunn bruker
// samme skala som maks høyde, så en skuff med lite innhold hugger innholdet
// i stedet for å stå halvtom.
const sizes: Record<DrawerSide, Record<DrawerSize, string>> = {
	left: { sm: "w-[320px]", md: "w-[400px]", lg: "w-[560px]" },
	right: { sm: "w-[320px]", md: "w-[400px]", lg: "w-[560px]" },
	top: { sm: "max-h-[240px]", md: "max-h-[400px]", lg: "max-h-[560px]" },
	bottom: { sm: "max-h-[240px]", md: "max-h-[400px]", lg: "max-h-[560px]" },
};

/**
 * Drawer - panel som glir inn fra en kant.
 *
 * Samme grunnmur som Modal: native `<dialog>` og `showModal()` gir fokusfelle,
 * inert bakgrunn, Escape og topplag, og implisitt `role="dialog"` med
 * `aria-modal="true"`.
 *
 * I `apps/web` må øya hydreres med `client:load`. Uten client-direktiv blir
 * skuffen statisk HTML og `showModal()` kjøres aldri. `client:visible`
 * hjelper ikke: en lukket dialog er `display: none` og krysser aldri
 * synsranden.
 */
export function Drawer({
	open,
	onClose,
	title,
	footer,
	side = "right",
	size = "md",
	showCloseButton = true,
	closeOnBackdropClick = true,
	className,
	children,
	"aria-labelledby": ariaLabelledBy,
	...rest
}: DrawerProps) {
	const titleId = `${useId()}-title`;
	const { dialogRef, dialogHandlers, scrollRef, canScroll } = useModalDialog({
		open,
		onClose,
		closeOnBackdropClick,
	});

	const edge = sides[side];
	const hasHeader = title != null || showCloseButton;

	return (
		// rest spres først med vilje: en konsument skal ikke kunne overskrive
		// bakteppehåndtereren eller ref-en og bryte dialogen.
		<dialog
			{...rest}
			aria-labelledby={ariaLabelledBy ?? (title != null ? titleId : undefined)}
			className={`${dialogBase} ${edge.dialog}`}
			onClick={dialogHandlers.onClick}
			onKeyDown={dialogHandlers.onKeyDown}
			onMouseDown={dialogHandlers.onMouseDown}
			ref={dialogRef}
			// Fallback for skuffer uten fokuserbart innhold: da skal fokus lande
			// på dialogen selv, ikke bli stående igjen bak den.
			tabIndex={-1}
		>
			<div
				className={[panelBase, edge.panel, edge.motion, sizes[side][size], className]
					.filter(Boolean)
					.join(" ")}
			>
				{hasHeader && (
					<div className="flex shrink-0 items-center gap-4 border-stroke-weak border-b px-6 py-5">
						{/* Alltid til stede: uten den ville lukkeknappen falt til
						    venstre i en skuff uten tittel. */}
						<div className="flex-1">
							{title != null && (
								<h2 className="text-h4 font-strong text-text-strong" id={titleId}>
									{title}
								</h2>
							)}
						</div>
						{showCloseButton && <DialogCloseButton onClick={onClose} />}
					</div>
				)}

				{/* Alltid til stede, også uten innhold: det er dette feltet som
				    strekker seg og holder knapperaden nede ved kanten. */}
				<div
					className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 text-body text-text-strong focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-stroke-focus"
					ref={scrollRef}
					tabIndex={canScroll ? 0 : undefined}
				>
					{children}
				</div>

				{footer != null && (
					<div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-stroke-weak border-t px-6 py-4">
						{footer}
					</div>
				)}
			</div>
		</dialog>
	);
}
