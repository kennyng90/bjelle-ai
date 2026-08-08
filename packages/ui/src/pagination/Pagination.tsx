import type { HTMLAttributes } from "react";
import { Icon } from "../icon/Icon.tsx";

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
	page?: number;
	total?: number;
	onChange?: (page: number) => void;
}

type PageItem = { kind: "page"; page: number } | { kind: "ellipsis"; key: string };

/**
 * Bygger sidelista: alltid første og siste side, gjeldende side med én nabo på
 * hver side, og ellipse der det hoppes over noe. Under åtte sider vises alle.
 */
function buildPages(current: number, total: number): PageItem[] {
	const items: PageItem[] = [];
	if (total <= 7) {
		for (let i = 1; i <= total; i++) items.push({ kind: "page", page: i });
		return items;
	}
	items.push({ kind: "page", page: 1 });
	if (current > 3) items.push({ kind: "ellipsis", key: "start" });
	for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
		items.push({ kind: "page", page: i });
	}
	if (current < total - 2) items.push({ kind: "ellipsis", key: "end" });
	items.push({ kind: "page", page: total });
	return items;
}

const buttonBase =
	"inline-flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-8 px-2 font-strong text-small tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus disabled:cursor-not-allowed disabled:text-text-disabled disabled:hover:bg-transparent motion-reduce:transition-none";

export function Pagination({
	page = 1,
	total = 1,
	onChange,
	className,
	...props
}: PaginationProps) {
	const pages = Math.max(1, Math.trunc(total));
	const current = Math.min(Math.max(1, Math.trunc(page)), pages);
	const go = (next: number) => {
		if (next < 1 || next > pages || next === current) return;
		onChange?.(next);
	};

	return (
		<nav
			aria-label="Paginering"
			className={["font-sans", className].filter(Boolean).join(" ")}
			{...props}
		>
			{/* gap-2, ikke gap-1: fokusringen stikker fire piksler ut, og med bare
			    fire piksler mellom knappene la den seg oppå naboen. */}
			<ol className="flex items-center gap-2">
				<li>
					<button
						// Ved kanten er knappen deaktivert, ikke en lenke uten mål.
						aria-label="Forrige side"
						className={`${buttonBase} text-text-strong hover:bg-fill-hover`}
						disabled={current <= 1}
						onClick={() => go(current - 1)}
						type="button"
					>
						<Icon name="ChevronLeft" size={18} />
					</button>
				</li>
				{buildPages(current, pages).map((item) =>
					item.kind === "ellipsis" ? (
						// Ellipsen er dekorativ og holdes utenfor tilgjengelighetstreet.
						<li
							aria-hidden="true"
							className="flex h-10 min-w-8 items-center justify-center text-small text-text-weak"
							key={item.key}
						>
							…
						</li>
					) : (
						<li key={item.page}>
							<button
								// Tallet alene er ikke et navn. "Side 3" er det, og det
								// inneholder den synlige teksten (WCAG 2.5.3).
								aria-current={item.page === current ? "page" : undefined}
								aria-label={`Side ${item.page}`}
								className={[
									buttonBase,
									item.page === current
										? "bg-fill-brand-strong text-text-on-strong"
										: "text-text-strong hover:bg-fill-hover",
								].join(" ")}
								onClick={() => go(item.page)}
								type="button"
							>
								{item.page}
							</button>
						</li>
					),
				)}
				<li>
					<button
						aria-label="Neste side"
						className={`${buttonBase} text-text-strong hover:bg-fill-hover`}
						disabled={current >= pages}
						onClick={() => go(current + 1)}
						type="button"
					>
						<Icon name="ChevronRight" size={18} />
					</button>
				</li>
			</ol>
		</nav>
	);
}
