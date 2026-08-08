import { type ChangeEvent, type DragEvent, useId, useState } from "react";
import { Icon } from "../icon/Icon.tsx";

export interface FileUploadProps {
	/** Synlig gruppelabel. Blir filfeltets tilgjengelige navn. */
	label: string;
	/** Hva slippsonen godtar. Vises under teksten og leses som beskrivelse. */
	hint?: string;
	/** Sendes til filvelgeren og håndheves også ved slipp. */
	accept?: string;
	multiple?: boolean;
	disabled?: boolean;
	/** Grense i byte. Filer over grensa avvises med melding i varselområdet. */
	maxSize?: number;
	/** Styrt modus. Utelat for å la komponenten holde lista selv. */
	files?: File[];
	defaultFiles?: File[];
	/** Ekstern feil, f.eks. fra serveren. Overstyrer komponentens egne meldinger. */
	error?: string;
	onChange?: (files: File[]) => void;
	id?: string;
	name?: string;
	className?: string;
}

/** Norsk filstørrelse: desimalkomma og SI-prefikser, som i Finder og Filutforsker. */
function formatSize(bytes: number) {
	if (bytes < 1000) return `${bytes} B`;
	const units = ["kB", "MB", "GB", "TB"];
	let value = bytes / 1000;
	let step = 0;
	while (value >= 1000 && step < units.length - 1) {
		value /= 1000;
		step += 1;
	}
	return `${value.toFixed(1).replace(".", ",")} ${units[step]}`;
}

function isAccepted(file: File, accept: string) {
	const patterns = accept
		.split(",")
		.map((m) => m.trim().toLowerCase())
		.filter(Boolean);
	if (patterns.length === 0) return true;

	const name = file.name.toLowerCase();
	const type = file.type.toLowerCase();
	return patterns.some((pattern) => {
		if (pattern.startsWith(".")) return name.endsWith(pattern);
		if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1));
		return type === pattern;
	});
}

/**
 * Slippsone for filopplasting, med filliste og fjern-knapper.
 *
 * Slippsonen er en `<label>` rundt en ekte `<input type="file">`. Kilden bruker
 * en `<div onClick>` som kaller `click()` på en skjult input - den kan ikke nås
 * med tastatur i det hele tatt. Her åpner nettleseren filvelgeren selv, både
 * ved klikk hvor som helst i sonen og ved Mellomrom eller Enter på feltet.
 *
 * Inputen er `sr-only`, ikke `display: none`. Skjult med display forsvinner den
 * også ut av tabrekkefølgen.
 *
 * Nettleseren håndhever `accept` i filvelgeren, men ikke ved slipp. Derfor
 * valideres begge veier her, og avvisningen havner i et varselområde i stedet
 * for å bli slukt i stillhet.
 *
 * I `apps/web` er dette en øy: den trenger `client:load` eller `client:visible`.
 * Uten client-direktiv virker verken slipp, fjerning eller validering.
 */
export function FileUpload({
	label,
	hint,
	accept,
	multiple = false,
	disabled = false,
	maxSize,
	files,
	defaultFiles,
	error,
	onChange,
	id,
	name,
	className,
}: FileUploadProps) {
	const base = useId();
	const fieldId = id ?? `${base}-field`;
	const labelId = `${base}-label`;
	const ctaId = `${base}-cta`;
	const helpId = `${base}-help`;

	const controlled = files !== undefined;
	const [internalFiles, setInternalFiles] = useState<File[]>(defaultFiles ?? []);
	const currentFiles = controlled ? files : internalFiles;
	const [dragOver, setDragOver] = useState(false);
	const [internalError, setInternalError] = useState<string | null>(null);
	const [status, setStatus] = useState("");

	const message = error ?? internalError;

	function validate(file: File) {
		if (maxSize !== undefined && file.size > maxSize) {
			return `${file.name} er større enn ${formatSize(maxSize)} og ble ikke lagt til.`;
		}
		if (accept && !isAccepted(file, accept)) {
			return `${file.name} har et filformat vi ikke tar imot.`;
		}
		return null;
	}

	function add(newFiles: File[]) {
		if (disabled || newFiles.length === 0) return;

		const accepted: File[] = [];
		const rejected: string[] = [];
		for (const file of newFiles) {
			const validationError = validate(file);
			if (validationError) rejected.push(validationError);
			else accepted.push(file);
		}
		setInternalError(rejected[0] ?? null);
		if (accepted.length === 0) return;

		const next = multiple ? [...currentFiles, ...accepted] : accepted.slice(0, 1);
		if (!controlled) setInternalFiles(next);
		onChange?.(next);
		setStatus(`${accepted.map((f) => f.name).join(", ")} er lagt til.`);
	}

	function remove(index: number) {
		const file = currentFiles[index];
		if (!file) return;
		const next = currentFiles.filter((_, i) => i !== index);
		if (!controlled) setInternalFiles(next);
		onChange?.(next);
		setStatus(`${file.name} er fjernet.`);
	}

	function handleSelect(event: ChangeEvent<HTMLInputElement>) {
		add(Array.from(event.target.files ?? []));
		// Nullstilles så samme fil kan velges på nytt etter at den er fjernet.
		event.target.value = "";
	}

	function handleDrop(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault();
		setDragOver(false);
		if (disabled) return;
		add(Array.from(event.dataTransfer.files));
	}

	const descriptions = [ctaId, hint ? helpId : null].filter(Boolean).join(" ");

	return (
		<div className={["flex flex-col font-sans", className].filter(Boolean).join(" ")}>
			<span className="text-small font-strong text-text-strong" id={labelId}>
				{label}
			</span>

			<label
				className={[
					"mt-1.5 flex flex-col items-center gap-2 rounded-12 border-2 border-dashed px-6 py-7 text-center",
					// Ikke transition-colors: outline-color er med der, og fokusringen
					// skal ikke tone inn.
					"transition-[background-color,border-color]",
					"has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-stroke-focus",
					disabled
						? "cursor-not-allowed border-stroke-disabled bg-fill-disabled"
						: "cursor-pointer",
					!disabled && dragOver
						? "border-stroke-brand-strong bg-fill-brand-weak"
						: !disabled && "border-stroke-strong bg-background-base hover:bg-fill-hover",
				]
					.filter(Boolean)
					.join(" ")}
				htmlFor={fieldId}
				onDragLeave={(event) => {
					if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
					setDragOver(false);
				}}
				onDragOver={(event) => {
					event.preventDefault();
					if (!disabled) setDragOver(true);
				}}
				onDrop={handleDrop}
			>
				<Icon
					className={disabled ? "text-icon-disabled" : "text-icon-brand"}
					name="CloudUpload"
					size={28}
				/>
				<span
					className={[
						"text-small font-strong",
						disabled ? "text-text-disabled" : "text-text-strong",
					].join(" ")}
					id={ctaId}
				>
					<span className={disabled ? undefined : "text-text-brand"}>Klikk for å laste opp</span>{" "}
					eller dra og slipp filer hit
				</span>
				{hint && (
					<span
						className={["text-tiny", disabled ? "text-text-disabled" : "text-text-weak"].join(" ")}
						id={helpId}
					>
						{hint}
					</span>
				)}
				<input
					accept={accept}
					aria-describedby={descriptions}
					aria-labelledby={labelId}
					className="sr-only"
					disabled={disabled}
					id={fieldId}
					multiple={multiple}
					name={name}
					onChange={handleSelect}
					type="file"
				/>
			</label>

			<ul
				aria-label="Valgte filer"
				className={["flex flex-col gap-2", currentFiles.length > 0 && "mt-3"]
					.filter(Boolean)
					.join(" ")}
			>
				{currentFiles.map((file, index) => (
					<li
						className="flex items-center gap-3 rounded-8 border border-stroke-weak bg-background-base py-2 pr-2 pl-3"
						key={`${file.name}-${file.size}-${file.lastModified}`}
					>
						<Icon className="shrink-0 text-icon-neutral" name="Paperclip" size={18} />
						<span className="min-w-0 flex-1 truncate text-left text-small text-text-strong">
							{file.name}
						</span>
						<span className="shrink-0 text-tiny text-text-weak tabular-nums">
							{formatSize(file.size)}
						</span>
						<button
							// "Fjern" alene er ubrukelig når skjermleseren lister opp
							// knappene ut av sammenheng.
							aria-label={`Fjern ${file.name}`}
							className={[
								"inline-flex size-8 shrink-0 items-center justify-center rounded-8 text-icon-neutral",
								"transition-[background-color,color] hover:bg-fill-hover hover:text-icon-strong",
								"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
								"disabled:cursor-not-allowed disabled:text-icon-disabled disabled:hover:bg-transparent",
							].join(" ")}
							disabled={disabled}
							onClick={() => remove(index)}
							type="button"
						>
							<Icon name="X" size={16} />
						</button>
					</li>
				))}
			</ul>

			{/* Området finnes alltid, også tomt. Et varselområde som først settes
			    inn i DOM-en sammen med teksten blir ikke lest av alle skjermlesere. */}
			<div role="alert">
				{message && (
					<p className="mt-2 flex items-center gap-1.5 text-small text-text-error">
						<Icon className="shrink-0" name="CircleAlert" size={16} />
						{message}
					</p>
				)}
			</div>

			<div aria-live="polite" className="sr-only" role="status">
				{status}
			</div>
		</div>
	);
}
