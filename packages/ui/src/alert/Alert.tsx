import type { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../icon/Icon.tsx";

export type AlertTone = "neutral" | "brand" | "success" | "warning" | "error" | "info";

/**
 * Hvordan meldingen skal annonseres.
 *
 * - `"none"` er standard, og riktig for bokser som står i dokumentet fra
 *   første render. En `role="alert"` der blir lest opp ved sideinnlasting og
 *   avbryter det brukeren holdt på med.
 * - `"polite"` gir `role="status"`: meldingen dukket opp underveis, men haster
 *   ikke.
 * - `"assertive"` gir `role="alert"` og klipper over pågående opplesning. Kun
 *   for feil som stopper brukeren.
 */
export type AlertAnnounce = "none" | "polite" | "assertive";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
	tone?: AlertTone;
	title?: string;
	/** Overstyrer tonens standardikon. */
	icon?: IconName;
	/** Viser en lukkeknapp og kaller denne. */
	onDismiss?: () => void;
	/** Navn på lukkeknappen. Bytt den ut når "melding" er for upresist. */
	dismissLabel?: string;
	/** Handling under brødteksten, typisk en `Button`. */
	action?: ReactNode;
	announce?: AlertAnnounce;
}

/*
 * Tonen bæres av tre ting: fyll, kantlinje og glyf. Ikonet får i tillegg et
 * navn for statustonene, slik at tonen ikke bare er en farge for den som
 * hører meldingen lest opp (WCAG 1.4.1).
 */
const tones: Record<AlertTone, { chrome: string; icon: string; glyph: IconName; label?: string }> =
	{
		neutral: {
			chrome: "border-stroke-weak bg-fill-weak",
			icon: "text-icon-neutral",
			glyph: "Info",
		},
		brand: {
			chrome: "border-stroke-brand-weak bg-fill-brand-weak",
			icon: "text-icon-brand",
			glyph: "Info",
		},
		success: {
			chrome: "border-stroke-success-weak bg-fill-success-weak",
			icon: "text-icon-success",
			glyph: "CircleCheck",
			label: "Vellykket",
		},
		warning: {
			chrome: "border-stroke-warning-weak bg-fill-warning-weak",
			icon: "text-icon-warning",
			glyph: "TriangleAlert",
			label: "Advarsel",
		},
		error: {
			chrome: "border-stroke-error-weak bg-fill-error-weak",
			icon: "text-icon-error",
			glyph: "CircleAlert",
			label: "Feil",
		},
		info: {
			chrome: "border-stroke-information-weak bg-fill-information-weak",
			icon: "text-icon-information",
			glyph: "Info",
			label: "Informasjon",
		},
	};

const roles: Record<AlertAnnounce, "status" | "alert" | undefined> = {
	none: undefined,
	polite: "status",
	assertive: "alert",
};

/**
 * Kontekstuell melding som står i innholdet. Til forskjell fra `Toast` går den
 * ikke bort av seg selv, og den peker på noe brukeren ser på akkurat nå.
 *
 * I `apps/web` trenger den `client:load` eller `client:visible` bare når
 * `onDismiss` eller en interaktiv `action` er i bruk. En ren informasjonsboks
 * uten handlinger kan stå som statisk HTML.
 */
export function Alert({
	tone = "info",
	title,
	icon,
	onDismiss,
	dismissLabel = "Lukk melding",
	action,
	announce = "none",
	className,
	children,
	...props
}: AlertProps) {
	const t = tones[tone];
	const classes = ["flex gap-3 rounded-12 border p-4 font-sans", t.chrome, className]
		.filter(Boolean)
		.join(" ");

	// Første tekstlinje er 24 px høy med tittel og 20 px uten. Ikonet er 20 px
	// og lukkeknappen 24 - de trenger hver sin justering for å stå optisk på
	// den linjen i begge tilfeller.
	const iconOffset = title ? "mt-0.5" : "";
	const dismissOffset = title ? "" : "-mt-0.5";

	return (
		<div className={classes} role={roles[announce]} {...props}>
			<Icon
				className={`shrink-0 ${t.icon} ${iconOffset}`}
				label={t.label}
				name={icon ?? t.glyph}
				size={20}
			/>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				{title && <p className="font-strong text-body text-text-strong">{title}</p>}
				{children && <div className="text-small text-text-weak">{children}</div>}
				{action && <div className="mt-2">{action}</div>}
			</div>
			{onDismiss && (
				<button
					aria-label={dismissLabel}
					className={`-mr-1 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-8 text-text-weak transition-colors hover:bg-fill-hover hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus ${dismissOffset}`}
					onClick={onDismiss}
					type="button"
				>
					<Icon name="X" size={16} />
				</button>
			)}
		</div>
	);
}
