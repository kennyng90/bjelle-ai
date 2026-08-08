import type { ReactNode } from "react";

/*
 * Delt oppsett for sidene under "Foundations".
 *
 * Ligger i foundations/, som indeksgeneratoren regner som privat - dette er
 * dokumentasjonsmaskineri, ikke en del av pakkens API.
 */

export function Section({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<section className="border-stroke-weak border-b p-8 last:border-b-0">
			<h2 className="font-strong text-h4 text-text-strong">{title}</h2>
			<p className="mt-1 max-w-2xl text-small text-text-weak">{description}</p>
			<div className="mt-6">{children}</div>
		</section>
	);
}

export function Tile({
	name,
	className,
	framed,
}: {
	name: string;
	className: string;
	framed?: boolean;
}) {
	return (
		<div className="flex flex-col gap-2">
			<div className={`h-16 rounded-8 ${className} ${framed ? "border border-stroke-weak" : ""}`} />
			<code className="font-mono text-tiny text-text-weak">{name}</code>
		</div>
	);
}

export function Page({ children }: { children: ReactNode }) {
	return <div className="bg-background-base font-sans">{children}</div>;
}
