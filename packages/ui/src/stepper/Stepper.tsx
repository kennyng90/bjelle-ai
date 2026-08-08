import type { OlHTMLAttributes, ReactNode } from "react";
import { Icon } from "../icon/Icon.tsx";

export interface Step {
	label: ReactNode;
	description?: ReactNode;
}

export interface StepperProps extends Omit<OlHTMLAttributes<HTMLOListElement>, "onChange"> {
	steps: (Step | string)[];
	/** 0-basert indeks for steget brukeren står på. */
	current?: number;
	/**
	 * Gjør stegene klikkbare. Uten denne er stepperen ren framdriftsvisning,
	 * og stegene ser heller ikke klikkbare ut.
	 */
	onChange?: (index: number) => void;
}

type StepStatus = "done" | "active" | "todo";

const statuses: Record<StepStatus, string> = {
	done: "Fullført",
	active: "Gjeldende steg",
	todo: "Ikke påbegynt",
};

const circles: Record<StepStatus, string> = {
	done: "bg-fill-brand-strong text-text-on-strong",
	active: "bg-fill-brand-strong text-text-on-strong",
	todo: "border border-stroke-strong text-text-weak",
};

export function Stepper({ steps, current = 0, onChange, className, ...props }: StepperProps) {
	// Et steg er definert av plassen sin i rekka: indeksen er identiteten.
	const items = steps.map((step, index) => ({
		key: `${index}`,
		index,
		label: typeof step === "string" ? step : step.label,
		description: typeof step === "string" ? undefined : step.description,
		status: (index < current ? "done" : index === current ? "active" : "todo") as StepStatus,
	}));

	return (
		<ol
			className={["flex w-full items-start font-sans", className].filter(Boolean).join(" ")}
			{...props}
		>
			{items.map((item) => {
				const status = item.status;
				const lastStep = item.index === items.length - 1;
				const content = (
					<>
						{/* Sirkelen er skjult for skjermlesere: nummeret og haken
						    gjentas i teksten under, som ellers ville blitt lest dobbelt. */}
						<span
							aria-hidden="true"
							className={`flex size-8 shrink-0 items-center justify-center rounded-full font-strong text-small tabular-nums ${circles[status]}`}
						>
							{status === "done" ? <Icon name="Check" size={18} strokeWidth={3} /> : item.index + 1}
						</span>
						<span className="flex flex-col gap-0.5">
							<span className="sr-only">{`Steg ${item.index + 1} av ${items.length}:`}</span>
							<span
								className={`font-strong text-small ${status === "todo" ? "text-text-weak" : "text-text-strong"}`}
							>
								{item.label}
							</span>
							{item.description && (
								<span className="text-text-weak text-tiny">{item.description}</span>
							)}
							{/* Fullført, gjeldende og kommende skilles av hake kontra
							    nummer visuelt, og av denne teksten for skjermlesere.
							    Farge alene bærer ikke tilstanden. */}
							<span className="sr-only">{statuses[status]}</span>
						</span>
					</>
				);

				const sharedClasses =
					"flex w-32 shrink-0 flex-col items-center gap-2 rounded-8 p-2 text-center";

				return (
					<li className={lastStep ? "flex shrink-0" : "flex flex-1"} key={item.key}>
						{onChange ? (
							<button
								aria-current={status === "active" ? "step" : undefined}
								className={`${sharedClasses} cursor-pointer transition-colors hover:bg-fill-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus motion-reduce:transition-none`}
								onClick={() => onChange(item.index)}
								type="button"
							>
								{content}
							</button>
						) : (
							<div
								aria-current={status === "active" ? "step" : undefined}
								className={sharedClasses}
							>
								{content}
							</div>
						)}
						{!lastStep && (
							// Wrapperen er like høy som sirkelen og sentrerer streken,
							// så den treffer sirkelens midtlinje uten en magisk piksel.
							// mx-1 holder streken unna fokusringen på et klikkbart steg,
							// som ligger 4 px utenfor knappen; uten den løp streken inn
							// under ringen.
							<span aria-hidden="true" className="mx-1 mt-2 flex h-8 flex-1 items-center">
								<span
									className={`h-0.5 w-full rounded-full ${item.index < current ? "bg-fill-brand-strong" : "bg-stroke-weak"}`}
								/>
							</span>
						)}
					</li>
				);
			})}
		</ol>
	);
}
