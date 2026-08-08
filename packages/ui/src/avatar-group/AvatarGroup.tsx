import type { HTMLAttributes } from "react";
import { Avatar, type AvatarProps } from "../avatar/Avatar.tsx";

export type AvatarGroupSize = "xs" | "sm" | "md" | "lg";

export type AvatarGroupItem = Pick<
	AvatarProps,
	"src" | "name" | "alt" | "icon" | "status" | "statusLabel"
>;

export interface AvatarGroupProps extends Omit<HTMLAttributes<HTMLUListElement>, "children"> {
	/** Navn eller Avatar-oppsett. En ren streng tolkes som navn. */
	avatars?: (string | AvatarGroupItem)[];
	/** Hvor mange som vises før resten samles i en "+N"-brikke. */
	max?: number;
	size?: AvatarGroupSize;
	/**
	 * Gruppens tilgjengelige navn, f.eks. "Deltakere". Påkrevd med vilje:
	 * en stabel navnløse avatarer forteller ikke hvem de er deltakere i.
	 */
	label: string;
}

const sizes: Record<AvatarGroupSize, string> = {
	xs: "size-6",
	sm: "size-8",
	md: "size-10",
	lg: "size-12",
};

/* Overlapp på ~30 % av diameteren, avrundet til 4px-rutenettet. */
const overlaps: Record<AvatarGroupSize, string> = {
	xs: "[&>li:not(:first-child)]:-ml-2",
	sm: "[&>li:not(:first-child)]:-ml-2",
	md: "[&>li:not(:first-child)]:-ml-3",
	lg: "[&>li:not(:first-child)]:-ml-4",
};

/* Brikka står litt under initialene i størrelse, som i kilden. */
const overflowText: Record<AvatarGroupSize, string> = {
	xs: "text-tiny",
	sm: "text-tiny",
	md: "text-small",
	lg: "text-body",
};

export function AvatarGroup({
	avatars = [],
	max = 4,
	size = "md",
	label,
	className,
	...props
}: AvatarGroupProps) {
	const visible = avatars.slice(0, max);
	const remaining = avatars.length - visible.length;

	return (
		<ul
			aria-label={label}
			className={[
				"isolate inline-flex items-center",
				// Statusprikken sitter nederst til høyre - nøyaktig der neste avatar
				// legger seg oppå. Uten løftet blir den skåret i to. `isolate` på
				// lista holder løftet innenfor gruppa.
				"[&_[data-avatar-status]]:z-10",
				overlaps[size],
				className,
			]
				.filter(Boolean)
				.join(" ")}
			{...props}
		>
			{visible.map((entry, i) => {
				const item: AvatarGroupItem = typeof entry === "string" ? { name: entry } : entry;
				return (
					<li
						// Navn er ikke garantert unikt, og lista er statisk. Indeks er
						// riktig nøkkel her.
						key={i}
						// `flex`, ikke blokk: Avatar er inline-flex, og som inline-innhold
						// får <li> en linjeboks som legger til descender-høyde. Da blir
						// punktet 24x26 på xs, og ringen rundt en oval i stedet for en
						// sirkel.
						//
						// `relative` er ikke pynt: uten den males ringen i lag med de
						// andre statiske bakgrunnene, altså _under_ Avatar-flatene, som
						// alle er `relative`. Skillet mellom avatarene forsvant da helt,
						// og to bilder ved siden av hverandre smeltet til én klump.
						//
						// `bg-background-base` er ikke dekor heller. Avatarflata er
						// `fill-brand-weak`, altså 5 % gjennomsiktig, så uten en tett
						// bunnplate skinner naboavataren gjennom initialavatarene som en
						// mørk linse. Samme flate som ringen låner farge fra.
						className="relative flex rounded-full bg-background-base ring-2 ring-background-base"
					>
						{/* I en gruppe står ingen navn ved siden av, så avataren er
						    bæreren av identiteten og får navnet sitt eksplisitt. */}
						<Avatar {...item} alt={item.alt ?? item.name} size={size} />
					</li>
				);
			})}

			{remaining > 0 && (
				<li
					className={[
						"relative flex shrink-0 items-center justify-center rounded-full",
						"bg-fill-weak font-sans font-strong text-text-weak",
						// Samme hårstrek som Avatar har. Fyllet er 4 % svart, altså
						// nesten usynlig mot hvitt: uten streken leses brikka som løs
						// tekst ved siden av stabelen, ikke som siste punkt i den.
						"inset-ring-1 inset-ring-stroke-overlay-weak",
						"ring-2 ring-background-base",
						sizes[size],
						overflowText[size],
					].join(" ")}
				>
					<span aria-hidden="true">+{remaining}</span>
					<span className="sr-only">{remaining} flere</span>
				</li>
			)}
		</ul>
	);
}
