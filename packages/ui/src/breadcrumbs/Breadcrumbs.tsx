import type { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../icon/Icon.tsx";

export interface Crumb {
	label: ReactNode;
	/** Uten href rendres leddet som ren tekst, ikke som en død lenke. */
	href?: string;
	icon?: IconName;
}

export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
	items: Crumb[];
}

const segmentBase = "inline-flex items-center gap-1.5 rounded-4";

export function Breadcrumbs({ items, className, ...props }: BreadcrumbsProps) {
	// Stien er definert av rekkefølgen sin: posisjonen er leddets identitet.
	const segments = items.map((item, index) => ({
		...item,
		key: `${index}`,
		last: index === items.length - 1,
	}));

	return (
		<nav
			aria-label="Brødsmuler"
			className={["font-sans text-small", className].filter(Boolean).join(" ")}
			{...props}
		>
			<ol className="flex flex-wrap items-center gap-2">
				{segments.map((item) => (
					<li className="flex items-center gap-2" key={item.key}>
						{item.last || !item.href ? (
							<span
								// Siste ledd er gjeldende side. Den er ikke en lenke -
								// en lenke til der du står er en blindvei.
								aria-current={item.last ? "page" : undefined}
								className={[
									segmentBase,
									item.last ? "font-strong text-text-strong" : "font-medium text-text-weak",
								].join(" ")}
							>
								{item.icon && <Icon className="text-icon-neutral" name={item.icon} size={16} />}
								{item.label}
							</span>
						) : (
							<a
								className={`${segmentBase} font-medium text-text-weak transition-colors hover:text-text-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus motion-reduce:transition-none`}
								href={item.href}
							>
								{item.icon && <Icon className="text-icon-neutral" name={item.icon} size={16} />}
								{item.label}
							</a>
						)}
						{/* Skilletegnet er dekorativt. Icon er aria-hidden som standard,
						    så skjermleseren slipper å lese "pil høyre" mellom hvert ledd. */}
						{!item.last && <Icon className="text-icon-neutral" name="ChevronRight" size={16} />}
					</li>
				))}
			</ol>
		</nav>
	);
}
