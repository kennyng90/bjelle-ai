import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { Stepper, type StepperProps } from "./Stepper.tsx";

const steps = ["Konto", "Profil", "Betaling"];

const meta: Meta<typeof Stepper> = {
	title: "Components/Stepper",
	component: Stepper,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
	args: { steps, current: 1 },
	argTypes: {
		current: { control: { type: "number", min: 0 } },
		steps: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const items = canvas.getAllByRole("listitem");
		await expect(items).toHaveLength(3);

		// Gjeldende steg er merket for skjermlesere, ikke bare farget.
		await expect(canvas.getByText("Gjeldende steg")).toBeInTheDocument();
		await expect(canvas.getByText("Fullført")).toBeInTheDocument();
		await expect(canvas.getByText("Ikke påbegynt")).toBeInTheDocument();
	},
};

export const FirstStep: Story = {
	args: { current: 0 },
};

export const WithDescriptions: Story = {
	args: {
		current: 1,
		steps: [
			{ label: "Konto", description: "E-post og passord" },
			{ label: "Profil", description: "Navn og bilde" },
			{ label: "Betaling", description: "Kort eller faktura" },
		],
	},
};

export const AllComplete: Story = {
	args: { current: 3 },
	play: async ({ canvas }) => {
		await expect(canvas.getAllByText("Fullført")).toHaveLength(3);
		await expect(canvas.queryByText("Gjeldende steg")).toBeNull();
	},
};

export const ManySteps: Story = {
	args: { current: 2, steps: ["Kontakt", "Adresse", "Frakt", "Betaling", "Kvittering"] },
};

function ClickableStepper(props: StepperProps) {
	const [current, setCurrent] = useState(props.current ?? 0);
	return <Stepper {...props} current={current} onChange={setCurrent} />;
}

export const Clickable: Story = {
	args: { current: 1 },
	render: (args) => <ClickableStepper {...args} />,
	play: async ({ canvas }) => {
		const buttons = canvas.getAllByRole("button");
		await expect(buttons).toHaveLength(3);

		// Det tilgjengelige navnet sier posisjon og status, ikke bare etiketten.
		await expect(buttons[0]).toHaveAccessibleName(/^Steg 1 av 3:\s+Konto\s+Fullført$/);
		await expect(buttons[1]).toHaveAttribute("aria-current", "step");

		// Stegene nås og aktiveres med tastatur.
		await userEvent.tab();
		await waitFor(() => expect(buttons[0]).toHaveFocus());
		await userEvent.keyboard("{Enter}");
		await waitFor(() => expect(buttons[0]).toHaveAttribute("aria-current", "step"));
		await expect(buttons[1]).not.toHaveAttribute("aria-current");

		await userEvent.tab();
		await waitFor(() => expect(buttons[1]).toHaveFocus());
		await userEvent.keyboard(" ");
		await waitFor(() => expect(buttons[1]).toHaveAttribute("aria-current", "step"));
	},
};
