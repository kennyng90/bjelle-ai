import type { HTMLAttributes, ReactNode } from "react";
import { useId, useState } from "react";
import type { HeadingRank } from "../heading/Heading.tsx";
import { Icon } from "../icon/Icon.tsx";

export interface AccordionItemData {
	/** Stabil nøkkel. Uten den brukes posisjonen i lista. */
	id?: string;
	title: ReactNode;
	content: ReactNode;
	defaultOpen?: boolean;
}

export interface AccordionProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
	items: AccordionItemData[];
	/** "single" lukker de andre når ett panel åpnes. */
	type?: "single" | "multiple";
	/**
	 * Nivået på overskriften rundt hver knapp. Skal følge omkringliggende
	 * dokument, ikke velges etter hvor stor teksten skal se ut.
	 */
	headingLevel?: HeadingRank;
	/** Kontrollert: nøklene til panelene som er åpne. */
	value?: string[];
	defaultValue?: string[];
	onChange?: (value: string[]) => void;
}

export interface AccordionItemProps {
	title: ReactNode;
	children?: ReactNode;
	/** Kontrollert åpen-tilstand. Utelates den, styrer raden seg selv. */
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	headingLevel?: HeadingRank;
	className?: string;
}

export function AccordionItem({
	title,
	children,
	open,
	defaultOpen = false,
	onOpenChange,
	headingLevel = 3,
	className,
}: AccordionItemProps) {
	const uid = useId();
	const triggerId = `${uid}-trigger`;
	const panelId = `${uid}-panel`;
	const controlled = open !== undefined;
	const [internal, setInternal] = useState(defaultOpen);
	const isOpen = controlled ? open : internal;
	const Heading = `h${headingLevel}` as const;

	const toggle = () => {
		if (!controlled) setInternal(!isOpen);
		onOpenChange?.(!isOpen);
	};

	return (
		<div className={["border-stroke-weak border-b font-sans", className].filter(Boolean).join(" ")}>
			<Heading>
				<button
					aria-controls={panelId}
					aria-expanded={isOpen}
					className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-4 py-4 text-left font-strong text-body text-text-strong transition-colors hover:text-text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus motion-reduce:transition-none"
					id={triggerId}
					onClick={toggle}
					type="button"
				>
					<span>{title}</span>
					<Icon
						className={`shrink-0 text-icon-neutral transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
						name="ChevronDown"
						size={20}
					/>
				</button>
			</Heading>
			{/* Høyden animeres av CSS alene: 0fr -> 1fr på en grid-rad. Ingen
			    måling, ingen JS-animasjon, ingenting som kan gå ut av takt. */}
			<div
				className={`grid transition-[grid-template-rows] motion-reduce:transition-none ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
			>
				<div className="overflow-hidden">
					{/* <section> med tilgjengelig navn gir role="region" uten å skrive
					    rollen. Lukket panel har høyde null, men ville fortsatt ligget i
					    tilgjengelighetstreet og tabrekkefølgen. inert tar det ut av
					    begge; aria-hidden sier det samme til eldre hjelpemidler. */}
					<section
						aria-hidden={!isOpen || undefined}
						aria-labelledby={triggerId}
						// pt-1 gir fokusringen til første element i panelet plass
						// innenfor overflow-hidden, så den ikke blir klippet på toppen.
						className="pt-1 pb-4 text-body text-text-weak"
						id={panelId}
						inert={!isOpen}
					>
						{children}
					</section>
				</div>
			</div>
		</div>
	);
}

export function Accordion({
	items,
	type = "multiple",
	headingLevel = 3,
	value,
	defaultValue,
	onChange,
	className,
	...props
}: AccordionProps) {
	const entries = items.map((item, index) => ({ ...item, key: item.id ?? `${index}` }));
	const controlled = value !== undefined;
	const [internal, setInternal] = useState<string[]>(
		() => defaultValue ?? entries.filter((item) => item.defaultOpen).map((item) => item.key),
	);
	const openKeys = controlled ? value : internal;

	const toggle = (key: string, shouldOpen: boolean) => {
		let next: string[];
		if (type === "single") next = shouldOpen ? [key] : [];
		else next = shouldOpen ? [...openKeys, key] : openKeys.filter((other) => other !== key);
		if (!controlled) setInternal(next);
		onChange?.(next);
	};

	return (
		<div
			className={["border-stroke-weak border-t font-sans", className].filter(Boolean).join(" ")}
			{...props}
		>
			{entries.map((item) => (
				<AccordionItem
					headingLevel={headingLevel}
					key={item.key}
					onOpenChange={(next) => toggle(item.key, next)}
					open={openKeys.includes(item.key)}
					title={item.title}
				>
					{item.content}
				</AccordionItem>
			))}
		</div>
	);
}
