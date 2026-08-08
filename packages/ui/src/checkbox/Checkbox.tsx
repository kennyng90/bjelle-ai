import { type InputHTMLAttributes, useEffect, useId, useRef } from "react";
import { Icon } from "../icon/Icon.tsx";

export type CheckboxSize = "sm" | "md";

export interface CheckboxProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type" | "onChange"> {
	label?: string;
	supportingText?: string;
	/** Feilmelding. Setter aria-invalid og vises med ikon og tekst, aldri farge alene. */
	error?: string;
	/** Verken av eller på. Brukes av en «velg alle» over en delvis avkrysset liste. */
	indeterminate?: boolean;
	size?: CheckboxSize;
	/**
	 * Får den nye tilstanden, ikke hendelsen. Alle kontrollene i Skjema-gruppa er
	 * like her. Trenger du selve hendelsen, ligger den native `onInput` i behold.
	 */
	onChange?: (checked: boolean) => void;
}

// Ruta er dekor; det er den gjennomsiktige inputen oppå som tar imot klikk og
// fokus. Derfor følger tilstanden med :has() på labelen i stedet for React-state
// - da stemmer den også når feltet er ukontrollert.
const boxBase =
	"flex items-center justify-center rounded-4 border bg-background-base text-text-on-strong transition-colors group-has-[:checked]:border-transparent group-has-[:checked]:bg-fill-brand-strong group-has-[:focus-visible]:outline-2 group-has-[:focus-visible]:outline-offset-2 group-has-[:focus-visible]:outline-stroke-focus";

// Treffflaten er alltid 24x24 (WCAG 2.5.8), også når ruta tegnes mindre.
const hitArea =
	"peer absolute top-1/2 left-1/2 m-0 size-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed";

const rowHeights: Record<CheckboxSize, string> = { sm: "h-5", md: "h-6" };
const boxSizes: Record<CheckboxSize, string> = { sm: "size-4", md: "size-5" };
const gaps: Record<CheckboxSize, string> = { sm: "gap-2", md: "gap-3" };
// Hjelpetekst og feil står under labelen, ikke under ruta.
const indents: Record<CheckboxSize, string> = { sm: "pl-6", md: "pl-8" };
const labelSizes: Record<CheckboxSize, string> = { sm: "text-small", md: "text-body" };
const glyphSizes: Record<CheckboxSize, number> = { sm: 12, md: 16 };

export function Checkbox({
	label,
	supportingText,
	error,
	indeterminate = false,
	size = "md",
	disabled = false,
	id,
	className,
	onChange,
	checked,
	"aria-describedby": ariaDescribedBy,
	...props
}: CheckboxProps) {
	const generatedId = useId();
	const fieldId = id ?? generatedId;
	const supportId = `${fieldId}-help`;
	const errorId = `${fieldId}-error`;
	const invalid = Boolean(error);
	const fieldRef = useRef<HTMLInputElement>(null);

	const describedBy =
		[ariaDescribedBy, supportingText && supportId, error && errorId].filter(Boolean).join(" ") ||
		undefined;

	// indeterminate finnes bare som DOM-property. Det er ingen attributt å sette,
	// så den må skrives etter render - og bare på klienten.
	useEffect(() => {
		if (fieldRef.current) fieldRef.current.indeterminate = indeterminate;
	}, [indeterminate, checked]);

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
				<span className={["relative flex shrink-0 items-center", rowHeights[size]].join(" ")}>
					<input
						{...props}
						aria-checked={indeterminate ? "mixed" : undefined}
						aria-describedby={describedBy}
						aria-invalid={invalid || undefined}
						checked={checked}
						className={hitArea}
						disabled={disabled}
						id={fieldId}
						onChange={(event) => onChange?.(event.target.checked)}
						ref={fieldRef}
						type="checkbox"
					/>
					<span
						aria-hidden="true"
						className={[
							boxBase,
							boxSizes[size],
							invalid ? "border-stroke-error-strong" : "border-stroke-strong",
							indeterminate && "border-transparent bg-fill-brand-strong",
						]
							.filter(Boolean)
							.join(" ")}
					>
						{indeterminate ? (
							<Icon name="Minus" size={glyphSizes[size]} strokeWidth={3} />
						) : (
							<Icon
								className="hidden group-has-[:checked]:block"
								name="Check"
								size={glyphSizes[size]}
								strokeWidth={3}
							/>
						)}
					</span>
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
