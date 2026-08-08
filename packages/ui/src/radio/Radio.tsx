import { type InputHTMLAttributes, useId } from "react";
import { Icon } from "../icon/Icon.tsx";

export type RadioSize = "sm" | "md";

export interface RadioProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type" | "onChange"> {
	label?: string;
	supportingText?: string;
	/** Feilmelding. Setter aria-invalid og vises med ikon og tekst, aldri farge alene. */
	error?: string;
	size?: RadioSize;
	/**
	 * Får verdien til knappen som ble valgt, ikke hendelsen. Alle kontrollene i
	 * Skjema-gruppa er like her.
	 */
	onChange?: (value: string) => void;
}

// Samme grep som Checkbox: ringen er dekor, den gjennomsiktige inputen oppå
// tar imot klikk og fokus, og tilstanden leses av CSS så den også stemmer
// ukontrollert.
const ringBase =
	"rounded-full border bg-background-base transition-colors group-has-[:checked]:border-transparent group-has-[:checked]:bg-fill-brand-strong group-has-[:focus-visible]:outline-2 group-has-[:focus-visible]:outline-offset-2 group-has-[:focus-visible]:outline-stroke-focus";

const hitArea =
	"peer absolute top-1/2 left-1/2 m-0 size-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed";

// Prikken sitter oppå ringen. pointer-events-none, ellers stjeler den klikket
// fra inputen som ligger under.
const dotBase =
	"pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-text-on-strong transition-transform group-has-[:checked]:scale-100";

const rowHeights: Record<RadioSize, string> = { sm: "h-5", md: "h-6" };
const ringSizes: Record<RadioSize, string> = { sm: "size-4", md: "size-5" };
const dotSizes: Record<RadioSize, string> = { sm: "size-1.5", md: "size-2" };
const gaps: Record<RadioSize, string> = { sm: "gap-2", md: "gap-3" };
const indents: Record<RadioSize, string> = { sm: "pl-6", md: "pl-8" };
const labelSizes: Record<RadioSize, string> = { sm: "text-small", md: "text-body" };

export function Radio({
	label,
	supportingText,
	error,
	size = "md",
	disabled = false,
	id,
	className,
	onChange,
	"aria-describedby": ariaDescribedBy,
	...props
}: RadioProps) {
	const generatedId = useId();
	const fieldId = id ?? generatedId;
	const supportId = `${fieldId}-help`;
	const errorId = `${fieldId}-error`;
	const invalid = Boolean(error);

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
				<span className={["relative flex shrink-0 items-center", rowHeights[size]].join(" ")}>
					<input
						{...props}
						aria-describedby={describedBy}
						aria-invalid={invalid || undefined}
						className={hitArea}
						disabled={disabled}
						id={fieldId}
						onChange={(event) => onChange?.(event.target.value)}
						type="radio"
					/>
					<span
						aria-hidden="true"
						className={[
							ringBase,
							ringSizes[size],
							invalid ? "border-stroke-error-strong" : "border-stroke-strong",
						].join(" ")}
					/>
					<span aria-hidden="true" className={[dotBase, dotSizes[size]].join(" ")} />
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
