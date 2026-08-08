import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { useId, useRef, useState } from "react";
import { Icon, type IconName } from "../icon/Icon.tsx";

export interface TabItem {
	value: string;
	label: ReactNode;
	icon?: IconName;
	badge?: ReactNode;
	/** Innholdet i fanens panel. Har ingen av fanene innhold, rendres kun fanerekka. */
	content?: ReactNode;
}

export type TabsVariant = "underline" | "pill";

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
	tabs: (TabItem | string)[];
	value?: string;
	defaultValue?: string;
	variant?: TabsVariant;
	/** Tilgjengelig navn på fanerekka. To fanerekker på samme side trenger hver sin. */
	label?: string;
	onChange?: (value: string) => void;
}

const tablists: Record<TabsVariant, string> = {
	underline: "flex items-end gap-6 border-stroke-weak border-b",
	pill: "flex flex-wrap items-center gap-2",
};

// -mb-px løfter fanen én piksel ned over kantlinja, så indikatoren dekker den
// i stedet for å ligge to piksler over. Ingen vannrett luft: kilden har
// padding "0 0 12px", så understreken skal flukte med tekstbredden og gapet
// mellom fanene skal være nøyaktig 24px fra tekst til tekst.
const tabShapes: Record<TabsVariant, string> = {
	underline: "-mb-px pt-2 pb-3",
	// Gjennomsiktig kant også når pilla er av, ellers hopper naboene én piksel
	// når den valgte får sin.
	pill: "rounded-8 border border-transparent px-4 py-2",
};

const tabStates: Record<TabsVariant, { idle: string; active: string }> = {
	underline: { idle: "text-text-weak hover:text-text-strong", active: "text-text-brand" },
	pill: {
		idle: "text-text-weak hover:bg-fill-hover hover:text-text-strong",
		// fill-brand-weak alene er nesten usynlig på hvitt, og da bæres
		// tilstanden av tekstfargen alene. Kanten gjør den valgte pilla
		// synlig også i gråtoner.
		active: "border-stroke-brand-weak bg-fill-brand-weak text-text-brand",
	},
};

const tabBase =
	"relative inline-flex cursor-pointer items-center gap-2 whitespace-nowrap font-strong text-body transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus motion-reduce:transition-none";

export function Tabs({
	tabs,
	value,
	defaultValue,
	variant = "underline",
	label,
	onChange,
	className,
	...props
}: TabsProps) {
	const uid = useId();
	const tablistRef = useRef<HTMLDivElement>(null);
	const items = tabs.map((tab) => (typeof tab === "string" ? { value: tab, label: tab } : tab));
	const controlled = value !== undefined;
	const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);
	const current = controlled ? value : internal;
	const hasPanels = items.some((tab) => tab.content !== undefined);

	const select = (next: string) => {
		if (!controlled) setInternal(next);
		onChange?.(next);
	};

	// Valget følger fokus, som i ARIA Authoring Practices for faner uten tung
	// innlasting: piltast flytter fokus OG bytter panel i samme bevegelse.
	const selectAndFocus = (index: number) => {
		const target = items[index];
		if (!target) return;
		select(target.value);
		tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index]?.focus();
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		const last = items.length - 1;
		if (event.key === "ArrowRight") {
			event.preventDefault();
			selectAndFocus(index === last ? 0 : index + 1);
		} else if (event.key === "ArrowLeft") {
			event.preventDefault();
			selectAndFocus(index === 0 ? last : index - 1);
		} else if (event.key === "Home") {
			event.preventDefault();
			selectAndFocus(0);
		} else if (event.key === "End") {
			event.preventDefault();
			selectAndFocus(last);
		}
	};

	return (
		<div className={["font-sans", className].filter(Boolean).join(" ")} {...props}>
			<div aria-label={label} className={tablists[variant]} ref={tablistRef} role="tablist">
				{items.map((tab, index) => {
					const active = tab.value === current;
					return (
						<button
							aria-controls={hasPanels ? `${uid}-panel-${tab.value}` : undefined}
							aria-selected={active}
							className={[
								tabBase,
								tabShapes[variant],
								active ? tabStates[variant].active : tabStates[variant].idle,
							].join(" ")}
							id={`${uid}-tab-${tab.value}`}
							key={tab.value}
							onClick={() => select(tab.value)}
							onKeyDown={(event) => handleKeyDown(event, index)}
							role="tab"
							// Roving tabindex: bare den valgte fanen er et tabstopp.
							tabIndex={active ? 0 : -1}
							type="button"
						>
							{tab.icon && <Icon name={tab.icon} size={16} />}
							{tab.label}
							{tab.badge != null && (
								<span
									className={[
										"inline-flex min-w-5 items-center justify-center rounded-full px-2 font-strong text-tiny tabular-nums",
										active
											? "bg-fill-brand-strong text-text-on-strong"
											: "bg-fill-weak text-text-weak",
									].join(" ")}
								>
									{tab.badge}
								</span>
							)}
							{variant === "underline" && (
								<span
									aria-hidden="true"
									className={[
										"absolute inset-x-0 bottom-0 h-0.5 origin-left rounded-full bg-fill-brand-strong transition-transform motion-reduce:transition-none",
										active ? "scale-x-100" : "scale-x-0",
									].join(" ")}
								/>
							)}
						</button>
					);
				})}
			</div>
			{hasPanels &&
				items.map((tab) => (
					<div
						aria-labelledby={`${uid}-tab-${tab.value}`}
						className="mt-4 text-body text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus"
						hidden={tab.value !== current}
						id={`${uid}-panel-${tab.value}`}
						key={tab.value}
						role="tabpanel"
						// ARIA Authoring Practices: panelet skal selv være et tabstopp,
						// ellers når ikke tastaturbrukere innhold uten egne fokuserbare
						// elementer. Regelen kjenner ikke unntaket for tabpanel.
						// biome-ignore lint/a11y/noNoninteractiveTabindex: påkrevd av fanemønsteret
						tabIndex={0}
					>
						{tab.content}
					</div>
				))}
		</div>
	);
}
