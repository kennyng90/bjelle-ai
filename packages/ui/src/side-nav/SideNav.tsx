import { type HTMLAttributes, type ReactNode, useId } from "react";
import { Icon, type IconName } from "../icon/Icon.tsx";

export interface SideNavLink {
	/**
	 * Synlig tekst. Også det tilgjengelige navnet når menyen er sammenslått,
	 * derfor er den `string` og ikke `ReactNode` - et ikon eller et fragment
	 * kan ikke fungere som navn.
	 */
	label: string;
	/** Identifiserer siden. Sammenlignes med `value` for å finne aktivt element. */
	value: string;
	icon?: IconName;
	/** Kort tall eller tekst til høyre. Leses opp som del av lenkenavnet. */
	badge?: ReactNode;
	/** Med `href` blir elementet en `<a>`, uten blir det en `<button>`. */
	href?: string;
}

export interface SideNavGroup {
	/** Overskrift. Blir også den nøstede listens tilgjengelige navn. */
	group: string;
	items: SideNavLink[];
}

export type SideNavEntry = SideNavLink | SideNavGroup;

export interface SideNavProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "onSelect"> {
	items: SideNavEntry[];
	/** `value` til siden som vises nå. Får `aria-current="page"`. */
	value?: string;
	/** Kalles når et element uten `href` velges. */
	onSelect?: (value: string) => void;
	brand?: ReactNode;
	footer?: ReactNode;
	/** Bredde i piksler i utvidet modus. */
	width?: number;
	/** Kun ikoner. Etikettene skjules visuelt, men fjernes ikke. */
	collapsed?: boolean;
	/**
	 * Slår på utvid/slå-sammen-knappen. `collapsed` er kontrollert, så
	 * komponenten forventer at du sender den nye verdien tilbake inn.
	 */
	onCollapsedChange?: (collapsed: boolean) => void;
}

/**
 * Sammenslått bredde er utledet av ikonaksen, ikke av radhøyden: raden har
 * `px-3` i begge moduser, så ikonet står 12 px inn fra radkanten uansett. Da
 * må innholdsbredden være 12 + 20 + 12 = 44 for at ikonet skal stå midt i
 * raden - og totalbredden 44 + 2x16 padding + 1 px høyrekant = 77.
 * Med 72 sto ikonet 2 px til venstre for der det står utslått, og hoppet
 * hver gang menyen ble slått sammen.
 */
const COLLAPSED_WIDTH = 77;

const rowBase =
	"group relative flex items-center rounded-8 text-small transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus";
const rowExpanded = "w-full gap-3 px-3 py-2.5 text-left";
// Samme px-3 som utslått: det er den som holder ikonet på samme loddrette
// akse i begge moduser. h-10 holder radhøyden, så ingenting hopper loddrett.
const rowCollapsed = "h-10 w-full px-3";
const rowInactive = "font-medium text-text-weak hover:bg-fill-hover hover:text-text-strong";
const rowActive = "font-strong bg-fill-brand-weak text-text-brand";

function isGroup(entry: SideNavEntry): entry is SideNavGroup {
	return "group" in entry;
}

function cx(...classes: (string | false | undefined)[]) {
	return classes.filter(Boolean).join(" ");
}

export function SideNav({
	items,
	value,
	onSelect,
	brand,
	footer,
	width = 264,
	collapsed = false,
	onCollapsedChange,
	className,
	"aria-label": ariaLabel = "Hovedmeny",
	...props
}: SideNavProps) {
	const listId = useId();
	const groupPrefix = useId();

	function renderItem(item: SideNavLink) {
		const active = item.value === value;
		const classes = cx(
			rowBase,
			collapsed ? rowCollapsed : rowExpanded,
			active ? rowActive : rowInactive,
		);

		const content = (
			<>
				{/*
				 * Tilstanden må ikke hvile på farge alene. Merkestreken er den
				 * formen som skiller aktiv rad fra resten også i gråtoner.
				 */}
				{active && (
					<span
						aria-hidden="true"
						className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full bg-fill-brand-strong"
					/>
				)}
				{item.icon && (
					<Icon
						className={
							active
								? "shrink-0 text-icon-brand"
								: "shrink-0 text-icon-neutral group-hover:text-icon-strong"
						}
						name={item.icon}
						size={20}
					/>
				)}
				<span className={collapsed ? "sr-only" : "flex-1 truncate"}>{item.label}</span>
				{item.badge != null &&
					(collapsed ? (
						<>
							<span className="sr-only">{item.badge}</span>
							{/*
							 * Prikken ligger i den frie 12 px-kolonnen til høyre for
							 * ikonet, ikke oppå glyfen. Derfor trenger den heller ingen
							 * ring for å løsrive seg fra den.
							 */}
							<span
								aria-hidden="true"
								className="absolute top-1 right-1 size-2 rounded-full bg-fill-brand-strong"
							/>
						</>
					) : (
						<span
							className={cx(
								"inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-tiny font-strong",
								active ? "bg-fill-brand-strong text-text-on-strong" : "bg-fill-weak text-text-weak",
							)}
						>
							{item.badge}
						</span>
					))}
			</>
		);

		return (
			<li key={item.value}>
				{item.href === undefined ? (
					<button
						aria-current={active ? "page" : undefined}
						className={classes}
						onClick={() => onSelect?.(item.value)}
						type="button"
					>
						{content}
					</button>
				) : (
					<a aria-current={active ? "page" : undefined} className={classes} href={item.href}>
						{content}
					</a>
				)}
			</li>
		);
	}

	return (
		<nav
			aria-label={ariaLabel}
			className={cx(
				"flex h-full shrink-0 flex-col border-r border-stroke-weak bg-background-base p-4 font-sans transition-[width]",
				className,
			)}
			style={{ width: collapsed ? COLLAPSED_WIDTH : width }}
			{...props}
		>
			{brand != null && (
				<div
					className={cx("mb-2 flex min-h-10 items-center", collapsed ? "justify-center" : "px-3")}
				>
					{brand}
				</div>
			)}

			{onCollapsedChange && (
				<button
					aria-controls={listId}
					aria-expanded={!collapsed}
					className={cx(rowBase, collapsed ? rowCollapsed : rowExpanded, rowInactive, "mb-1")}
					onClick={() => onCollapsedChange(!collapsed)}
					type="button"
				>
					<Icon
						className="shrink-0 text-icon-neutral group-hover:text-icon-strong"
						name={collapsed ? "PanelLeftOpen" : "PanelLeftClose"}
						size={20}
					/>
					<span className={collapsed ? "sr-only" : "flex-1 truncate"}>
						{collapsed ? "Utvid menyen" : "Slå sammen menyen"}
					</span>
				</button>
			)}

			{/*
			 * `-m-2 p-2` utvider rullecontaineren inn i navens padding uten å
			 * flytte innholdet. Uten den klipper overflow-y fokusringen, som
			 * ligger 4 px utenfor elementet. Den må gjelde begge akser: med bare
			 * `-mx-2 px-2` ble ringen rundt øverste og nederste rad klippet på
			 * tvers.
			 */}
			<ul className="-m-2 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2" id={listId}>
				{items.map((entry, index) => {
					if (!isGroup(entry)) return renderItem(entry);

					const groupId = `${groupPrefix}-${index}`;
					return (
						<li key={entry.group}>
							{/*
							 * Ikke en <h2>: nivået avhenger av siden komponenten står i, og
							 * en gjettet overskrift ødelegger overskriftsrekkefølgen. Navnet
							 * kobles på den nøstede lista i stedet, som er det
							 * skjermleseren faktisk trenger her.
							 */}
							<span
								className={cx(
									"block text-tiny font-strong tracking-wider text-text-weak uppercase",
									collapsed ? "sr-only" : "px-3 pt-4 pb-1.5",
								)}
								id={groupId}
							>
								{entry.group}
							</span>
							<ul
								aria-labelledby={groupId}
								className={cx(
									"flex flex-col gap-0.5",
									collapsed && "mt-2 border-t border-stroke-weak pt-2",
								)}
							>
								{entry.items.map(renderItem)}
							</ul>
						</li>
					);
				})}
			</ul>

			{footer != null && <div className="mt-3 border-t border-stroke-weak pt-3">{footer}</div>}
		</nav>
	);
}
