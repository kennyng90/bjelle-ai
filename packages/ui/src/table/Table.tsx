import { type HTMLAttributes, isValidElement, type ReactNode, useId } from "react";
import { Icon } from "../icon/Icon.tsx";

export type TableAlign = "left" | "center" | "right";
export type TableSortDirection = "asc" | "desc";

export interface TableColumn<R> {
	key: string;
	header: ReactNode;
	align?: TableAlign;
	/** Fast kolonnebredde. Tall tolkes som piksler. */
	width?: number | string;
	sortable?: boolean;
	/** Egendefinert celle. Uten denne vises `row[key]`. */
	render?: (row: R) => ReactNode;
}

export interface TableProps<R> extends Omit<HTMLAttributes<HTMLElement>, "children"> {
	columns: TableColumn<R>[];
	rows: R[];
	/**
	 * Tabellens tittel. Blir <caption>, som gir både tabellen og rulleområdet
	 * tilgjengelig navn. En tabell uten navn er en tabell ingen finner igjen.
	 */
	caption: ReactNode;
	/** Skjuler tittelen visuelt. Navnet blir liggende i tilgjengelighetstreet. */
	captionHidden?: boolean;
	sortKey?: string;
	sortDir?: TableSortDirection;
	onSort?: (key: string) => void;
	/** Nøkkel per rad. Faller tilbake på `row.id`, deretter posisjon. */
	getRowId?: (row: R, index: number) => string;
	/** Vises i stedet for rader når `rows` er tom. */
	emptyState?: ReactNode;
}

const alignClasses: Record<TableAlign, string> = {
	left: "text-left",
	center: "text-center",
	right: "text-right",
};

const justifyClasses: Record<TableAlign, string> = {
	left: "justify-start",
	center: "justify-center",
	right: "justify-end",
};

function defaultRowId(row: unknown, index: number): string {
	if (row !== null && typeof row === "object" && "id" in row) {
		const id = (row as { id: unknown }).id;
		if (typeof id === "string" || typeof id === "number") return String(id);
	}
	return String(index);
}

function defaultCell(row: unknown, key: string): ReactNode {
	const value = (row as Record<string, unknown>)[key];
	if (value === null || value === undefined || typeof value === "boolean") return null;
	if (typeof value === "string" || typeof value === "number") return value;
	if (isValidElement(value)) return value;
	return String(value);
}

export function Table<R>({
	columns,
	rows,
	caption,
	captionHidden = false,
	sortKey,
	sortDir = "asc",
	onSort,
	getRowId = defaultRowId,
	emptyState,
	className,
	...props
}: TableProps<R>) {
	const captionId = useId();

	const wrapperClasses = [
		// Rullingen skjer her. tabIndex gjør at området også kan rulles med
		// tastatur - uten den er innhold utenfor kanten utilgjengelig uten mus.
		"w-full overflow-x-auto rounded-12 border border-stroke-weak bg-background-raised",
		"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus",
		className,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<section
			aria-labelledby={captionId}
			className={wrapperClasses}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: et rulleområde uten tabstopp kan bare rulles med mus (axe: scrollable-region-focusable)
			tabIndex={0}
			{...props}
		>
			<table className="w-full border-collapse font-sans text-body">
				<caption
					className={
						captionHidden ? "sr-only" : "px-4 py-3 text-left text-small font-medium text-text-weak"
					}
					id={captionId}
				>
					{caption}
				</caption>
				<thead>
					<tr className="border-b border-stroke-weak bg-background-sunken">
						{columns.map((column) => {
							const align = column.align ?? "left";
							const active = column.sortable === true && sortKey === column.key;
							// I høyrestilte kolonner står ikonet foran teksten. Ellers flukter
							// overskriften med ikonet i stedet for med tallene under den.
							const sortIcon = (
								<Icon
									className={active ? "text-icon-brand" : "text-icon-neutral"}
									name={
										active ? (sortDir === "asc" ? "ChevronUp" : "ChevronDown") : "ChevronsUpDown"
									}
									size={14}
								/>
							);
							return (
								<th
									aria-sort={
										column.sortable === true
											? active
												? sortDir === "asc"
													? "ascending"
													: "descending"
												: "none"
											: undefined
									}
									className={[
										"text-small font-strong whitespace-nowrap text-text-weak",
										alignClasses[align],
										column.sortable === true ? "p-0" : "px-4 py-3",
									].join(" ")}
									key={column.key}
									scope="col"
									style={column.width === undefined ? undefined : { width: column.width }}
								>
									{column.sortable === true ? (
										// Sorteringen er en knapp, ikke en klikkbar <th>: den skal
										// nås med Tab og utløses med Enter og mellomrom.
										// Fokusringen ligger innenfor cella, ellers klipper
										// rulleområdet den bort.
										<button
											className={[
												"flex w-full items-center gap-1 px-4 py-3 transition-colors",
												"hover:text-text-strong",
												"focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-stroke-focus",
												justifyClasses[align],
											].join(" ")}
											onClick={() => onSort?.(column.key)}
											type="button"
										>
											{align === "right" && sortIcon}
											{column.header}
											{align !== "right" && sortIcon}
										</button>
									) : (
										column.header
									)}
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody className="divide-y divide-stroke-weak">
					{rows.length === 0 && emptyState != null ? (
						<tr>
							<td
								className="px-4 py-8 text-center text-body text-text-weak"
								colSpan={columns.length}
							>
								{emptyState}
							</td>
						</tr>
					) : (
						rows.map((row, index) => (
							<tr key={getRowId(row, index)}>
								{columns.map((column) => (
									<td
										className={[
											"px-4 py-3 align-middle text-text-strong",
											alignClasses[column.align ?? "left"],
										].join(" ")}
										key={column.key}
									>
										{column.render ? column.render(row) : defaultCell(row, column.key)}
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>
		</section>
	);
}
