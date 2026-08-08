import type { HTMLAttributes, MouseEvent } from "react";
import { Icon, type IconName } from "../icon/Icon.tsx";

export type TagSize = "sm" | "md";

// `onClick` og `onRemove` havner på ekte knapper inni brikken, ikke på span-en.
// Den arvede span-varianten må derfor ut, ellers kan den settes uten å virke.
export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, "onClick"> {
	/** Valgt tilstand. Speiles i `aria-pressed` og i et hakeikon. */
	selected?: boolean;
	size?: TagSize;
	/** Ikon foran teksten. Byttes ut med haken når brikken er valgt. */
	leadingIcon?: IconName;
	/** Gjør etiketten til en av/på-knapp. */
	onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
	/** Viser en fjern-knapp til høyre og kaller denne. */
	onRemove?: (event: MouseEvent<HTMLButtonElement>) => void;
	/**
	 * Hva fjern-knappen skal si at den fjerner. Utledes fra `children` når det
	 * er en streng, så `<Tag onRemove>Oslo Børs</Tag>` blir "Fjern Oslo Børs".
	 * Sett den selv når innholdet ikke er ren tekst.
	 */
	removeLabel?: string;
}

const base =
	"relative inline-flex shrink-0 items-center whitespace-nowrap rounded-8 border font-sans font-medium transition-colors";

const sizes: Record<TagSize, string> = {
	sm: "h-8 gap-1.5 px-3 text-tiny",
	md: "h-10 gap-2 px-4 text-small",
};

// Etiketten er sitt eget flex-element når den er klikkbar, og trenger da samme
// mellomrom som brikken ellers har.
const gaps: Record<TagSize, string> = { sm: "gap-1.5", md: "gap-2" };

/*
 * Fjern-knappen er 4 px mindre enn brikken er høy, og spiser høyre polstring
 * ned til 4 px. Da får den en jevn 4 px glorie hele veien rundt - det er den
 * flaten øyet leser, ikke avstanden fra krysset til kanten.
 */
const removePadding = "pr-1";

const removeSizes: Record<TagSize, string> = { sm: "size-6", md: "size-8" };

/*
 * Fjern-knappen er den ene fokusringen i biblioteket som ikke kan ha 2 px
 * avstand. Knappen er 4 px mindre enn brikken er høy, og en ring på
 * `outline-offset-2` legger seg da 4 px utenfor knappen - nøyaktig oppå
 * brikkens egen kant, hele veien rundt. Resultatet er en blå sirkel som
 * tangerer og bryter ut av brikken i stedet for å ligge inni den, og i valgt
 * tilstand har kanten omtrent samme farge som ringen, så de smelter sammen.
 *
 * Med `outline-offset-0` klemmer ringen seg rundt sirkelen og får 2 px ren
 * luft inn til brikkekanten i begge størrelser. Husregelen er
 * `outline-offset-2`, og dette er det bevisste unntaket fra den - fokusringen
 * er fortsatt 2 px i `stroke-focus`, det er bare avstanden som er null.
 */
const removeFocus =
	"focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-stroke-focus";

const iconSizes: Record<TagSize, number> = { sm: 14, md: 16 };

/**
 * Brukerstyrt merkelapp: et filtervalg, en emneknagg, en mottaker i et felt.
 * Til forskjell fra `Badge`, som bare forteller hva noe er, kan en Tag velges
 * og fjernes.
 *
 * Valgt tilstand formidles med tre signaler - `aria-pressed`, fyll og et
 * hakeikon - fordi farge alene ikke er nok (WCAG 1.4.1).
 *
 * I `apps/web` er dette en Astro-øy: uten `client:load` eller `client:visible`
 * rendres brikken som statisk HTML, og verken valg eller fjerning virker.
 */
export function Tag({
	selected = false,
	size = "md",
	leadingIcon,
	onClick,
	onRemove,
	removeLabel,
	className,
	children,
	...props
}: TagProps) {
	const interactive = Boolean(onClick);
	const iconSize = iconSizes[size];

	const classes = [
		base,
		sizes[size],
		onRemove && removePadding,
		selected
			? "border-stroke-brand-strong bg-fill-brand-weak text-text-brand"
			: "border-stroke-strong bg-background-base text-text-strong",
		interactive && (selected ? "hover:border-stroke-selected" : "hover:bg-fill-hover"),
		className,
	]
		.filter(Boolean)
		.join(" ");

	const label = (
		<>
			{selected ? (
				<Icon name="Check" size={iconSize} />
			) : (
				leadingIcon && <Icon name={leadingIcon} size={iconSize} />
			)}
			{children}
		</>
	);

	const name = removeLabel ?? (typeof children === "string" ? children : undefined);

	return (
		<span className={classes} {...props}>
			{onClick ? (
				/*
				 * Knappen dekker bare etiketten, men ::after strekkes over hele
				 * brikken. Da blir hele flaten klikkbar og fokusringen legger seg
				 * rundt brikken i stedet for rundt et utsnitt inni den - uten at
				 * fjern-knappen havner inne i en knapp.
				 */
				<button
					aria-pressed={selected}
					className={`inline-flex cursor-pointer items-center outline-none ${gaps[size]} after:absolute after:inset-0 after:rounded-8 focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-stroke-focus`}
					onClick={onClick}
					type="button"
				>
					{label}
				</button>
			) : (
				label
			)}
			{onRemove && (
				<button
					aria-label={name ? `Fjern ${name}` : "Fjern"}
					className={`relative z-10 inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full ${removeSizes[size]} hover:bg-fill-hover ${removeFocus}`}
					onClick={onRemove}
					type="button"
				>
					<Icon name="X" size={iconSize} />
				</button>
			)}
		</span>
	);
}
