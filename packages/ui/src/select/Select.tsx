import { type SelectHTMLAttributes, useId } from "react";
import { Icon } from "../icon/Icon.tsx";

export type SelectSize = "sm" | "md";

export interface SelectOption {
	value: string;
	label: string;
}

export interface SelectProps
	extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size" | "onChange"> {
	label?: string;
	supportingText?: string;
	/** Feilmelding. Setter aria-invalid og vises med ikon og tekst, aldri farge alene. */
	error?: string;
	/** Enten ferdige par, eller strenger der verdi og etikett er den samme. */
	options?: (SelectOption | string)[];
	/** Tomt førstevalg. Vises dempet, og kan ikke velges tilbake. */
	placeholder?: string;
	size?: SelectSize;
	/**
	 * Får den nye verdien, ikke hendelsen. Alle kontrollene i Skjema-gruppa er
	 * like her. Trenger du selve hendelsen, ligger den native `onInput` i behold.
	 */
	onChange?: (value: string) => void;
}

// Et ekte <select>. Tastaturet, skrivesøket og systemlista på mobil følger
// med gratis, og ingen gjenoppfunnet liste kan ta det igjen.
const fieldBase =
	"w-full appearance-none rounded-8 border bg-background-base font-sans text-text-strong transition-[border-color,background-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus disabled:cursor-not-allowed disabled:border-stroke-disabled disabled:bg-fill-disabled disabled:text-text-disabled";

// Plassholderen er ikke en verdi, og skal ikke se ut som en.
const placeholderTone = "has-[option[value='']:checked]:text-text-weak";

const sizes: Record<SelectSize, string> = {
	sm: "h-10 pl-3 pr-10 text-small",
	md: "h-12 pl-4 pr-12 text-body",
};

const chevronInset: Record<SelectSize, string> = { sm: "right-3", md: "right-4" };
const iconSizes: Record<SelectSize, number> = { sm: 16, md: 20 };

export function Select({
	label,
	supportingText,
	error,
	options = [],
	placeholder,
	size = "md",
	disabled = false,
	id,
	className,
	onChange,
	value,
	defaultValue,
	"aria-describedby": ariaDescribedBy,
	...props
}: SelectProps) {
	const generatedId = useId();
	const fieldId = id ?? generatedId;
	const supportId = `${fieldId}-help`;
	const errorId = `${fieldId}-error`;
	const invalid = Boolean(error);

	const describedBy =
		[ariaDescribedBy, supportingText && supportId, error && errorId].filter(Boolean).join(" ") ||
		undefined;

	// Uten dette faller nettleseren tilbake på første ekte alternativ, og
	// plassholderen blir aldri vist.
	const uncontrolledStart =
		value === undefined && defaultValue === undefined && placeholder ? "" : defaultValue;

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
			<div className="relative">
				<select
					{...props}
					aria-describedby={describedBy}
					aria-invalid={invalid || undefined}
					className={[
						fieldBase,
						placeholderTone,
						sizes[size],
						invalid ? "border-stroke-error-strong" : "border-stroke-strong",
					].join(" ")}
					disabled={disabled}
					id={fieldId}
					onChange={(event) => onChange?.(event.target.value)}
					{...(value === undefined ? { defaultValue: uncontrolledStart } : { value })}
				>
					{placeholder && (
						<option disabled value="">
							{placeholder}
						</option>
					)}
					{options.map((option) => {
						const optionValue = typeof option === "string" ? option : option.value;
						const optionLabel = typeof option === "string" ? option : option.label;
						return (
							<option key={optionValue} value={optionValue}>
								{optionLabel}
							</option>
						);
					})}
				</select>
				<Icon
					className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${chevronInset[size]} ${
						disabled ? "text-icon-disabled" : "text-icon-neutral"
					}`}
					name="ChevronDown"
					size={iconSizes[size]}
				/>
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
