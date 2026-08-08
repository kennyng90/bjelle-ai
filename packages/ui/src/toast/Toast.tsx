import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "../icon/Icon.tsx";

export type ToastTone = "neutral" | "success" | "warning" | "error" | "info";

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
	tone?: ToastTone;
	title?: string;
	/** Overstyrer tonens standardikon. */
	icon?: IconName;
	/** Viser en lukkeknapp og kaller denne. Kalles også når `duration` løper ut. */
	onDismiss?: () => void;
	dismissLabel?: string;
	/** Handling til slutt i varselet, typisk "Angre". */
	action?: ReactNode;
	/**
	 * Millisekunder før varselet lukker seg selv. Utelatt betyr at det blir
	 * stående til brukeren lukker det.
	 *
	 * Nedtellingen står stille så lenge pekeren er over varselet eller fokus er
	 * inne i det, og starter på nytt når begge deler er borte (WCAG 2.2.1).
	 * `onDismiss` må være stabil - en ny funksjon på hver render nullstiller
	 * nedtellingen.
	 */
	duration?: number;
	/**
	 * Hvor påtrengende varselet leses opp. Utledes fra tonen: feil avbryter,
	 * alt annet venter til skjermleseren er ledig.
	 */
	announce?: "polite" | "assertive";
}

/*
 * Varselet ligger på den inverse flaten, som snur med temaet: nesten svart i
 * lyst tema, hvit i mørkt. Kildens tonefarger (--green-dark-1000 og
 * slektningene) kan ikke brukes rått - de gir 9:1 mot den mørke flaten, men
 * 1.8-2.0:1 mot den lyse. `icon-inverse-*` er de samme fargene speilet med
 * temaet, og holder 4.85-10.38:1 på begge sider.
 *
 * Tonen bæres likevel ikke av farge alene: hver glyf er forskjellig, og
 * ikonet har et `label` så tonen også når den som får varselet lest opp.
 */
const tones: Record<ToastTone, { glyph: IconName; color: string; label?: string }> = {
	neutral: { glyph: "Info", color: "text-icon-inverse-strong" },
	success: { glyph: "CircleCheck", color: "text-icon-inverse-success", label: "Vellykket" },
	warning: { glyph: "TriangleAlert", color: "text-icon-inverse-warning", label: "Advarsel" },
	error: { glyph: "CircleAlert", color: "text-icon-inverse-error", label: "Feil" },
	info: { glyph: "Info", color: "text-icon-inverse-information", label: "Informasjon" },
};

/**
 * Flyktig varsel på inverse flate. Til forskjell fra `Alert` står det ikke i
 * innholdet, men over det, og forsvinner igjen.
 *
 * Varselet er sitt eget live-område. Skjermlesere annonserer live-områder mest
 * pålitelig når beholderen allerede finnes i DOM-en før innholdet dukker opp -
 * legg derfor en tom varselstabel i layouten i stedet for å montere den
 * sammen med det første varselet.
 *
 * I `apps/web` må varselet monteres med `client:load`. Uten det rendres det som
 * statisk HTML: verken nedtelling, pause eller lukkeknapp virker.
 */
export function Toast({
	tone = "neutral",
	title,
	icon,
	onDismiss,
	dismissLabel = "Lukk varsel",
	action,
	duration,
	announce = tone === "error" ? "assertive" : "polite",
	className,
	children,
	...props
}: ToastProps) {
	const t = tones[tone];
	const [paused, setPaused] = useState(false);

	useEffect(() => {
		if (!duration || !onDismiss || paused) {
			return;
		}
		const id = setTimeout(onDismiss, duration);
		return () => clearTimeout(id);
	}, [duration, onDismiss, paused]);

	const classes = [
		"flex min-w-80 max-w-100 gap-3 rounded-12 bg-background-inverse p-4 font-sans shadow-xl",
		className,
	]
		.filter(Boolean)
		.join(" ");

	const iconOffset = title ? "mt-0.5" : "";
	const dismissOffset = title ? "" : "-mt-0.5";

	return (
		// Håndtererne er ikke klikk. De stanser nedtellingen så lenge pekeren eller
		// fokus er inne i varselet, slik at lukkeknappen rekkes med tastatur før
		// varselet forsvinner (WCAG 2.2.1).
		// biome-ignore lint/a11y/noStaticElementInteractions: elementet har rollen status eller alert, men den velges i et uttrykk og regelen ser bare litteraler
		<div
			aria-atomic="true"
			className={classes}
			role={announce === "assertive" ? "alert" : "status"}
			{...props}
			onBlur={() => setPaused(false)}
			onFocus={() => setPaused(true)}
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
		>
			<Icon
				className={`shrink-0 ${t.color} ${iconOffset}`}
				label={t.label}
				name={icon ?? t.glyph}
				size={20}
			/>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				{title && <p className="font-strong text-body text-text-inverse-strong">{title}</p>}
				{children && <div className="text-small text-text-inverse-weak">{children}</div>}
				{action && <div className="mt-2">{action}</div>}
			</div>
			{onDismiss && (
				<button
					aria-label={dismissLabel}
					className={`-mr-1 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-8 text-text-inverse-weak transition-colors hover:bg-fill-inverse-hover hover:text-text-inverse-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-inverse-stronger ${dismissOffset}`}
					onClick={onDismiss}
					type="button"
				>
					<Icon name="X" size={16} />
				</button>
			)}
		</div>
	);
}
