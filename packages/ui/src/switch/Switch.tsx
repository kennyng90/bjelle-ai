import { type InputHTMLAttributes, useId, useState } from "react";
import { Icon } from "../icon/Icon.tsx";

export type SwitchSize = "sm" | "md";

export interface SwitchProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type" | "onChange"> {
	label?: string;
	supportingText?: string;
	/** Feilmelding. Setter aria-invalid og vises med ikon og tekst, aldri farge alene. */
	error?: string;
	size?: SwitchSize;
	/**
	 * Får den nye tilstanden, ikke hendelsen. Alle kontrollene i Skjema-gruppa er
	 * like her. Trenger du selve hendelsen, ligger den native `onInput` i behold.
	 */
	onChange?: (checked: boolean) => void;
}

/*
 * Et ekte avkrysningsfelt med role="switch". Mellomrom slår den, labelen kobles
 * med htmlFor, og skjemaet får med seg verdien - alt gratis.
 *
 * Sporet er stroke-strong i av-tilstand, ikke fill-overlay som i kilden.
 * fill-overlay er nesten svart i mørkt tema, og en avslått bryter forsvant helt
 * i bakgrunnen. Knotten er text-on-strong, som snur med temaet og dermed holder
 * kontrast mot både grått og blått spor.
 */
const trackBase =
	"pointer-events-none absolute inset-0 rounded-full bg-stroke-strong transition-colors group-has-[:checked]:bg-fill-brand-strong group-has-[:focus-visible]:outline-2 group-has-[:focus-visible]:outline-stroke-focus";

/*
 * Feilkanten ligger utenpå sporet, ikke inni det.
 *
 * En `border` inni ville tegnet rødt rett mot sporfyllet: 1.7:1 mot
 * stroke-strong i lyst tema og usynlig i mørkt, og den ville spist en av de to
 * pikslene knotten har på hver side. Utenpå står den mot sideflaten og leses i
 * begge temaer. Fokusringen flyttes samtidig ut til offset 4, ellers legger
 * outline seg oppå ringen og den røde kanten forsvinner så snart bryteren får
 * fokus - altså akkurat når brukeren skal rette feilen.
 */
const errorRing = "ring-2 ring-stroke-error-strong group-has-[:focus-visible]:outline-offset-4";
const normalRing = "group-has-[:focus-visible]:outline-offset-2";

const knobBase =
	"pointer-events-none absolute top-1/2 left-0.5 -translate-y-1/2 rounded-full bg-text-on-strong shadow-sm transition-transform";

// Treffflaten er alltid minst 24 høy, også når sporet tegnes lavere.
const hitArea =
	"peer absolute top-1/2 left-0 m-0 h-6 w-full -translate-y-1/2 cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed";

const trackSizes: Record<SwitchSize, string> = { sm: "h-5 w-9", md: "h-6 w-11" };
const knobSizes: Record<SwitchSize, string> = { sm: "size-4", md: "size-5" };
const knobTravel: Record<SwitchSize, string> = {
	sm: "group-has-[:checked]:translate-x-4",
	md: "group-has-[:checked]:translate-x-5",
};
const gaps: Record<SwitchSize, string> = { sm: "gap-2", md: "gap-3" };
const indents: Record<SwitchSize, string> = { sm: "pl-11", md: "pl-14" };
const labelSizes: Record<SwitchSize, string> = { sm: "text-small", md: "text-body" };

export function Switch({
	label,
	supportingText,
	error,
	size = "md",
	disabled = false,
	id,
	className,
	onChange,
	checked,
	defaultChecked,
	"aria-describedby": ariaDescribedBy,
	...props
}: SwitchProps) {
	const generatedId = useId();
	const fieldId = id ?? generatedId;
	const supportId = `${fieldId}-help`;
	const errorId = `${fieldId}-error`;
	const invalid = Boolean(error);
	const controlled = checked !== undefined;
	// role="switch" krever aria-checked. Attributtet må derfor speile tilstanden
	// også når bryteren er ukontrollert - ellers står det og lyver til
	// skjermleseren etter første klikk. Verdien leses av selve DOM-en i onChange,
	// så den kan ikke komme ut av takt med det brukeren ser.
	const [internalOn, setInternalOn] = useState(defaultChecked ?? false);
	const on = controlled ? checked : internalOn;

	const describedBy =
		[ariaDescribedBy, supportingText && supportId, error && errorId].filter(Boolean).join(" ") ||
		undefined;

	return (
		<div className={["flex flex-col gap-1 font-sans", className].filter(Boolean).join(" ")}>
			<label
				className={[
					"group flex w-fit items-start",
					gaps[size],
					disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer",
				].join(" ")}
				htmlFor={fieldId}
			>
				<span className={["relative flex shrink-0 items-center", trackSizes[size]].join(" ")}>
					<input
						{...props}
						aria-checked={on}
						aria-describedby={describedBy}
						aria-invalid={invalid || undefined}
						checked={checked}
						className={hitArea}
						defaultChecked={defaultChecked}
						disabled={disabled}
						id={fieldId}
						onChange={(event) => {
							setInternalOn(event.target.checked);
							onChange?.(event.target.checked);
						}}
						role="switch"
						type="checkbox"
					/>
					<span
						aria-hidden="true"
						className={[trackBase, invalid ? errorRing : normalRing].join(" ")}
					/>
					<span
						aria-hidden="true"
						className={[knobBase, knobSizes[size], knobTravel[size]].join(" ")}
					/>
				</span>
				{label && (
					<span className={[labelSizes[size], "font-medium text-text-strong"].join(" ")}>
						{label}
					</span>
				)}
			</label>
			{supportingText && (
				<p className={["text-small text-text-weak", indents[size]].join(" ")} id={supportId}>
					{supportingText}
				</p>
			)}
			{error && (
				<p
					className={["flex gap-2 text-small text-text-error", indents[size]].join(" ")}
					id={errorId}
					role="alert"
				>
					<Icon className="mt-0.5 shrink-0" name="CircleAlert" size={16} />
					{error}
				</p>
			)}
		</div>
	);
}
