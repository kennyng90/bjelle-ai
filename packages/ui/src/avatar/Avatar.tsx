import type { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../icon/Icon.tsx";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type AvatarStatus = "online" | "busy" | "away" | "offline";

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
	/** Bilde-URL. Faller tilbake til initialer, så til ikon. */
	src?: string;
	/** Brukes til initialer, og som standard tilgjengelig navn. */
	name?: string;
	/**
	 * Tilgjengelig navn. Faller tilbake til `name`. Sett `alt=""` når navnet
	 * allerede står som tekst ved siden av avataren - da er avataren dekorativ
	 * og skal ikke lese opp det samme en gang til.
	 */
	alt?: string;
	/** Ikon når verken bilde eller navn finnes. */
	icon?: IconName;
	size?: AvatarSize;
	status?: AvatarStatus;
	/** Overstyrer standardteksten for statusprikken. */
	statusLabel?: string;
}

const sizes: Record<AvatarSize, string> = {
	xs: "size-6",
	sm: "size-8",
	md: "size-10",
	lg: "size-12",
	xl: "size-14",
	"2xl": "size-16",
};

/*
 * Kilden regner initialstørrelsen som 40 % av diameteren. Typerampen har ikke
 * kontinuerlige verdier, så hvert trinn er rundet til nærmeste trinn i rampen.
 * De to minste havner begge på `text-tiny` - 13px er bunnen i rampen, og
 * kildens 9.6px på xs hadde uansett vært uleselig.
 */
const textSizes: Record<AvatarSize, string> = {
	xs: "text-tiny",
	sm: "text-tiny",
	md: "text-body",
	lg: "text-h4",
	xl: "text-h4",
	"2xl": "text-h3",
};

const iconSizes: Record<AvatarSize, number> = { xs: 12, sm: 16, md: 20, lg: 24, xl: 28, "2xl": 32 };

/* Prikken ligger på ~25-33 % av diameteren, avrundet til 4px-rutenettet. */
const dotSizes: Record<AvatarSize, string> = {
	xs: "size-2",
	sm: "size-2",
	md: "size-3",
	lg: "size-3",
	xl: "size-4",
	"2xl": "size-4",
};

const statusFills: Record<AvatarStatus, string> = {
	online: "bg-fill-success-strong",
	busy: "bg-fill-error-strong",
	away: "bg-fill-warning-strong",
	offline: "bg-icon-neutral",
};

const statusLabels: Record<AvatarStatus, string> = {
	online: "Pålogget",
	busy: "Opptatt",
	away: "Borte",
	offline: "Frakoblet",
};

/*
 * xs er 24px. To initialer der fyller sirkelen helt ut, og i en AvatarGroup -
 * der neste avatar dekker en tredjedel av den forrige - smelter "AL" og "GH"
 * sammen til "ALGH". Én bokstav er lesbar også overlappet.
 */
const initialCounts: Record<AvatarSize, number> = {
	xs: 1,
	sm: 2,
	md: 2,
	lg: 2,
	xl: 2,
	"2xl": 2,
};

function toInitials(name: string, count: number): string {
	return name
		.trim()
		.split(/\s+/)
		.map((del) => del[0])
		.slice(0, count)
		.join("")
		.toUpperCase();
}

export function Avatar({
	src,
	name,
	alt,
	icon = "User",
	size = "md",
	status,
	statusLabel,
	className,
	...props
}: AvatarProps) {
	const accessibleName = alt ?? name ?? "";
	const initials = name ? toInitials(name, initialCounts[size]) : null;

	const surface = [
		"flex size-full items-center justify-center overflow-hidden rounded-full",
		"bg-fill-brand-weak font-sans font-strong text-text-brand",
		textSizes[size],
	].join(" ");

	const fallback = initials ?? (
		<Icon className="text-icon-brand" name={icon} size={iconSizes[size]} />
	);

	/*
	 * Tre klart adskilte tilfeller framfor én span med betinget rolle:
	 *
	 * - Bilde: <img> bærer navnet selv gjennom alt.
	 * - Initialer eller ikon med navn: `role="img"` gjør barna presentasjonelle,
	 *   så "AL" leses ikke bokstav for bokstav. Navnet kommer fra aria-label.
	 * - Uten navn: flata er dekorativ og skjules, ellers hadde initialene lekket
	 *   ut som tilfeldig tekst midt i en setning.
	 */
	let display: ReactNode;
	if (src) {
		display = (
			<span className={surface}>
				<img alt={accessibleName} className="size-full object-cover" src={src} />
			</span>
		);
	} else if (accessibleName) {
		display = (
			<span aria-label={accessibleName} className={surface} role="img">
				{fallback}
			</span>
		);
	} else {
		display = (
			<span aria-hidden="true" className={surface}>
				{fallback}
			</span>
		);
	}

	return (
		<span
			className={["relative inline-flex shrink-0 align-middle", sizes[size], className]
				.filter(Boolean)
				.join(" ")}
			{...props}
		>
			{display}

			{/*
			 * Hårstreken ligger som eget overlegg og ikke som `inset-ring` på flata:
			 * en inset-skygge males under innholdet, så bildet hadde spist den.
			 */}
			<span
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 rounded-full border border-stroke-overlay-weak"
			/>

			{status && (
				<span
					className={[
						"absolute right-0 bottom-0 rounded-full ring-2 ring-background-base",
						dotSizes[size],
						statusFills[status],
					].join(" ")}
					// Kroken AvatarGroup løfter prikken etter. I en stabel dekker neste
					// avatar nøyaktig hjørnet prikken står i, og en halv prikk er verre
					// enn ingen.
					data-avatar-status=""
				>
					{/* Prikken bærer mening. Farge alene er ikke et tekstalternativ. */}
					<span className="sr-only">{statusLabel ?? statusLabels[status]}</span>
				</span>
			)}
		</span>
	);
}
