import { type TextareaHTMLAttributes, useId } from "react";
import { Icon } from "../icon/Icon.tsx";

export interface TextareaProps
	extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
	label?: string;
	supportingText?: string;
	/** Feilmelding. Setter aria-invalid og vises med ikon og tekst, aldri farge alene. */
	error?: string;
	/**
	 * Får den nye verdien, ikke hendelsen. Alle kontrollene i Skjema-gruppa er
	 * like her. Trenger du selve hendelsen, ligger den native `onInput` i behold.
	 */
	onChange?: (value: string) => void;
}

// Samme kant og ring som TextInput. Feltet kan bare dras høyere, ikke bredere:
// horisontal resize sprenger kolonnen den ligger i.
const fieldBase =
	"w-full resize-y rounded-8 border bg-background-base px-4 py-3 font-sans text-body text-text-strong transition-[border-color,background-color] placeholder:text-text-weak focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus disabled:cursor-not-allowed disabled:resize-none disabled:border-stroke-disabled disabled:bg-fill-disabled disabled:text-text-disabled";

export function Textarea({
	label,
	supportingText,
	error,
	rows = 4,
	disabled = false,
	id,
	className,
	onChange,
	"aria-describedby": ariaDescribedBy,
	...props
}: TextareaProps) {
	const generatedId = useId();
	const fieldId = id ?? generatedId;
	const supportId = `${fieldId}-help`;
	const errorId = `${fieldId}-error`;
	const invalid = Boolean(error);

	const describedBy =
		[ariaDescribedBy, supportingText && supportId, error && errorId].filter(Boolean).join(" ") ||
		undefined;

	return (
		<div className={["flex flex-col gap-2 font-sans", className].filter(Boolean).join(" ")}>
			{label && (
				<label
					className={[
						"text-small font-strong",
						disabled ? "text-text-disabled" : "text-text-strong",
					].join(" ")}
					htmlFor={fieldId}
				>
					{label}
				</label>
			)}
			<textarea
				{...props}
				aria-describedby={describedBy}
				aria-invalid={invalid || undefined}
				className={[
					fieldBase,
					invalid ? "border-stroke-error-strong" : "border-stroke-strong",
				].join(" ")}
				disabled={disabled}
				id={fieldId}
				onChange={(event) => onChange?.(event.target.value)}
				rows={rows}
			/>
			{supportingText && (
				<p className="text-small text-text-weak" id={supportId}>
					{supportingText}
				</p>
			)}
			{error && (
				<p className="flex gap-2 text-small text-text-error" id={errorId} role="alert">
					<Icon className="mt-0.5 shrink-0" name="CircleAlert" size={16} />
					{error}
				</p>
			)}
		</div>
	);
}
