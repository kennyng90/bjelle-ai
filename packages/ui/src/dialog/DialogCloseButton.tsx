import { Icon } from "../icon/Icon.tsx";

export interface DialogCloseButtonProps {
	onClick: () => void;
}

/**
 * Lukkeknappen i Modal og Drawer. Intern - overleggene eksponerer den gjennom
 * `showCloseButton`, ikke som egen komponent.
 *
 * 40x40 treffområde med negativ marg, så den optisk står i linje med tittelen
 * i stedet for å skyve toppen ut.
 */
export function DialogCloseButton({ onClick }: DialogCloseButtonProps) {
	return (
		<button
			aria-label="Lukk"
			className="-my-2 -mr-2 flex size-10 shrink-0 items-center justify-center rounded-8 text-icon-neutral transition-colors hover:bg-fill-hover hover:text-icon-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus"
			onClick={onClick}
			type="button"
		>
			<Icon name="X" size={20} />
		</button>
	);
}
