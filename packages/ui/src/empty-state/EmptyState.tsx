import type { HTMLAttributes, ReactNode } from "react";
import type { HeadingRank } from "../heading/Heading.tsx";
import { Icon, type IconName } from "../icon/Icon.tsx";

export type EmptyStateTone = "brand" | "neutral" | "success" | "warning" | "error" | "info";
/** Nivå 1 er sidens tittel. En tom tilstand er aldri det. */

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
	icon?: IconName;
	/** Hva som mangler, konkret. "Ingen varsler ennå", ikke "Ingen data". */
	title: string;
	/** Hva brukeren kan gjøre med det. */
	description?: string;
	action?: ReactNode;
	tone?: EmptyStateTone;
	/**
	 * Overskriftsnivået. Må velges ut fra hvor komponenten står, ellers hopper
	 * siden over et nivå og skjermleserens overskriftsliste blir feil.
	 */
	headingLevel?: HeadingRank;
}

const tones: Record<EmptyStateTone, string> = {
	brand: "bg-fill-brand-weak text-icon-brand",
	neutral: "bg-fill-weak text-icon-neutral",
	success: "bg-fill-success-weak text-icon-success",
	warning: "bg-fill-warning-weak text-icon-warning",
	error: "bg-fill-error-weak text-icon-error",
	info: "bg-fill-information-weak text-icon-information",
};

const headings = { 2: "h2", 3: "h3", 4: "h4", 5: "h5", 6: "h6" } as const;

export function EmptyState({
	icon = "Inbox",
	title,
	description,
	action,
	tone = "brand",
	headingLevel = 2,
	className,
	...props
}: EmptyStateProps) {
	const Heading = headings[headingLevel];
	const wrapper = ["flex flex-col items-center px-6 py-12 text-center font-sans", className]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={wrapper} {...props}>
			{/* Flisen er dekorasjon. Ikonet gjentar overskriften og har ingenting
			    å tilføre i tilgjengelighetstreet. */}
			<span
				aria-hidden="true"
				className={`mb-4 inline-flex size-14 items-center justify-center rounded-16 ${tones[tone]}`}
			>
				<Icon name={icon} size={28} />
			</span>
			<Heading className="text-balance text-h4 font-strong text-text-strong">{title}</Heading>
			{description && (
				/*
				 * Måltall for linjelengde, ikke en pikselbredde: teksten skal bryte
				 * på samme antall tegn uansett skriftstørrelse.
				 *
				 * `text-balance` fordi teksten er midtstilt. Uten den fyller første
				 * linje hele måltallet og siste linje blir en kort stump under -
				 * en skjev trekant som er det som får en tom tilstand til å se
				 * uferdig ut framfor rolig.
				 */
				<p className="mt-2 max-w-[46ch] text-balance text-body text-text-weak">{description}</p>
			)}
			{action && <div className="mt-6">{action}</div>}
		</div>
	);
}
