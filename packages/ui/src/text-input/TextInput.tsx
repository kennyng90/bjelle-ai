import { type InputHTMLAttributes, useId } from "react";
import { Icon, type IconName } from "../icon/Icon.tsx";

export type TextInputSize = "sm" | "md";

export interface TextInputProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "onChange"> {
	label?: string;
	supportingText?: string;
	/** Feilmelding. Setter aria-invalid og vises med ikon og tekst, aldri farge alene. */
	error?: string;
	leadingIcon?: IconName;
	trailingIcon?: IconName;
	size?: TextInputSize;
	/**
	 * Får den nye verdien, ikke hendelsen. Alle kontrollene i Skjema-gruppa er
	 * like her. Trenger du selve hendelsen, ligger den native `onInput` i behold.
	 */
	onChange?: (value: string) => void;
}

// Kanten er 1px i alle tilstander og fokusringen ligger utenpå som outline.
// Kilden går fra 1px til 2px inset ring på fokus; det flytter innholdet en
// piksel hver gang feltet får fokus.
const fieldBase =
	"w-full rounded-8 border bg-background-base font-sans text-text-strong transition-[border-color,background-color] placeholder:text-text-weak focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus disabled:cursor-not-allowed disabled:border-stroke-disabled disabled:bg-fill-disabled disabled:text-text-disabled";

const sizes: Record<TextInputSize, string> = {
	sm: "h-10 px-3 text-small",
	md: "h-12 px-4 text-body",
};

// Ikonet står i selve kantsonen, så teksten må starte etter det.
const leadingPad: Record<TextInputSize, string> = { sm: "pl-10", md: "pl-12" };
const trailingPad: Record<TextInputSize, string> = { sm: "pr-10", md: "pr-12" };
const leadingInset: Record<TextInputSize, string> = { sm: "left-3", md: "left-4" };
const trailingInset: Record<TextInputSize, string> = { sm: "right-3", md: "right-4" };
const iconSizes: Record<TextInputSize, number> = { sm: 16, md: 20 };

export function TextInput({
	label,
	supportingText,
	error,
	leadingIcon,
	trailingIcon,
	size = "md",
	disabled = false,
	id,
	className,
	onChange,
	"aria-describedby": ariaDescribedBy,
	...props
}: TextInputProps) {
	const generatedId = useId();
	const inputId = id ?? generatedId;
	const supportId = `${inputId}-help`;
	const errorId = `${inputId}-error`;
	const invalid = Boolean(error);
	const iconSize = iconSizes[size];
	const iconTone = disabled ? "text-icon-disabled" : "text-icon-neutral";

	// Egne beskrivelser legges til, ikke over: en konsument kan ha koblet på sin egen.
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
					htmlFor={inputId}
				>
					{label}
				</label>
			)}
			<div className="relative">
				{leadingIcon && (
					<Icon
						className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${leadingInset[size]} ${iconTone}`}
						name={leadingIcon}
						size={iconSize}
					/>
				)}
				<input
					{...props}
					aria-describedby={describedBy}
					aria-invalid={invalid || undefined}
					className={[
						fieldBase,
						sizes[size],
						invalid ? "border-stroke-error-strong" : "border-stroke-strong",
						leadingIcon && leadingPad[size],
						trailingIcon && trailingPad[size],
					]
						.filter(Boolean)
						.join(" ")}
					disabled={disabled}
					id={inputId}
					onChange={(event) => onChange?.(event.target.value)}
				/>
				{trailingIcon && (
					<Icon
						className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${trailingInset[size]} ${iconTone}`}
						name={trailingIcon}
						size={iconSize}
					/>
				)}
			</div>
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
