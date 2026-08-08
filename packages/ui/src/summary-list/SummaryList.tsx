import type { HTMLAttributes, ReactNode } from "react";

export interface SummaryItem {
	label: ReactNode;
	value: ReactNode;
	/** Nøkkel for React-lista. Faller tilbake på posisjon når den mangler. */
	id?: string;
}

export interface SummaryListProps extends HTMLAttributes<HTMLElement> {
	items: SummaryItem[];
	/** Vises i stedet for lista når `items` er tom. */
	emptyState?: ReactNode;
}

export function SummaryList({ items, emptyState, className, ...props }: SummaryListProps) {
	if (items.length === 0 && emptyState != null) {
		return (
			<p
				className={["py-3 font-sans text-body text-text-weak", className].filter(Boolean).join(" ")}
				{...props}
			>
				{emptyState}
			</p>
		);
	}

	const classes = ["divide-y divide-stroke-weak font-sans", className].filter(Boolean).join(" ");

	return (
		// <dl> med <dt>/<dd>, ikke rader av div-er: paret er hele poenget, og
		// skjermlesere leser det bare som par når oppmerkingen sier det.
		<dl className={classes} {...props}>
			{items.map((item, index) => (
				<div className="flex items-baseline justify-between gap-6 py-3" key={item.id ?? `${index}`}>
					<dt className="text-body text-text-weak">{item.label}</dt>
					<dd className="m-0 text-right text-body font-medium text-text-strong">{item.value}</dd>
				</div>
			))}
		</dl>
	);
}
