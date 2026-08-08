import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import { Button } from "../button/Button.tsx";
import { ButtonGroup } from "./ButtonGroup.tsx";

const meta: Meta<typeof ButtonGroup> = {
	title: "Components/ButtonGroup",
	component: ButtonGroup,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { label: "Visning" },
	argTypes: {
		size: { control: "inline-radio", options: [undefined, "sm", "md", "lg", "xl"] },
		variant: {
			control: "inline-radio",
			options: ["primary", "secondary", "tertiary", "brand-tertiary", "destructive"],
		},
		children: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => (
		<ButtonGroup {...args}>
			<Button>Dag</Button>
			<Button>Uke</Button>
			<Button>Måned</Button>
		</ButtonGroup>
	),
	play: async ({ canvas }) => {
		const group = canvas.getByRole("group", { name: "Visning" });
		const buttons = canvas.getAllByRole("button");
		await expect(buttons).toHaveLength(3);

		// Radius kun på ytterkantene. Bryter man sammenkoblingen, får den
		// midterste knappen radius og sømmen blir synlig.
		const first = getComputedStyle(buttons[0]);
		const middle = getComputedStyle(buttons[1]);
		const last = getComputedStyle(buttons[2]);
		await expect(first.borderTopLeftRadius).toBe("8px");
		await expect(first.borderTopRightRadius).toBe("0px");
		await expect(middle.borderTopLeftRadius).toBe("0px");
		await expect(middle.borderTopRightRadius).toBe("0px");
		await expect(last.borderTopLeftRadius).toBe("0px");
		await expect(last.borderTopRightRadius).toBe("8px");

		// Delt kantlinje: knapp nr. 2 og 3 trekkes 1px inn over naboens kant,
		// slik at det står én hårstrek mellom segmentene og ikke to.
		await expect(middle.marginLeft).toBe("-1px");
		await expect(last.marginLeft).toBe("-1px");
		await expect(first.marginLeft).toBe("0px");

		// Gruppa skal ikke være bredere enn segmentene minus overlappet.
		const sum = buttons.reduce((n, b) => n + b.getBoundingClientRect().width, 0);
		await expect(group.getBoundingClientRect().width).toBeCloseTo(sum - 2, 0);
	},
};

export const WithIcons: Story = {
	args: { label: "Tekstjustering" },
	render: (args) => (
		<ButtonGroup {...args}>
			<Button leadingIcon="TextAlignStart">Venstre</Button>
			<Button leadingIcon="TextAlignCenter">Midtstilt</Button>
			<Button leadingIcon="TextAlignEnd">Høyre</Button>
		</ButtonGroup>
	),
};

export const IconsOnly: Story = {
	args: { label: "Tekststil" },
	render: (args) => (
		<ButtonGroup {...args}>
			<Button aria-label="Fet" leadingIcon="Bold" />
			<Button aria-label="Kursiv" leadingIcon="Italic" />
			<Button aria-label="Understreket" leadingIcon="Underline" />
		</ButtonGroup>
	),
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex flex-col items-start gap-4">
			{(["sm", "md", "lg", "xl"] as const).map((size) => (
				<ButtonGroup {...args} key={size} label={`Visning ${size}`} size={size}>
					<Button>Dag</Button>
					<Button>Uke</Button>
					<Button>Måned</Button>
				</ButtonGroup>
			))}
		</div>
	),
	play: async ({ canvas }) => {
		// Gruppestørrelsen skal slå gjennom på barna som ikke setter sin egen.
		const small = canvas.getAllByRole("group")[0];
		const large = canvas.getAllByRole("group")[3];
		await expect(small.querySelector("button")?.getBoundingClientRect().height).toBe(32);
		await expect(large.querySelector("button")?.getBoundingClientRect().height).toBe(56);
		// xl har 12px radius i Button. Gruppa må følge etter, ellers får det
		// ytterste hjørnet 8px og bryter med en enkeltstående xl-knapp.
		const first = large.querySelectorAll("button")[0];
		await expect(getComputedStyle(first).borderTopLeftRadius).toBe("12px");
	},
};

function SelectedGroup() {
	const [selected, setSelected] = useState("uke");
	const options = [
		{ id: "dag", text: "Dag" },
		{ id: "uke", text: "Uke" },
		{ id: "maaned", text: "Måned" },
	];

	return (
		<ButtonGroup label="Tidsrom">
			{options.map((v) => (
				<Button
					aria-pressed={selected === v.id}
					key={v.id}
					onClick={() => setSelected(v.id)}
					variant={selected === v.id ? "primary" : "secondary"}
				>
					{v.text}
				</Button>
			))}
		</ButtonGroup>
	);
}

export const SelectedState: Story = {
	render: () => <SelectedGroup />,
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("button", { pressed: true })).toHaveAccessibleName("Uke");

		// Valgt tilstand må være synlig, ikke bare programmatisk. Barnas egen
		// variant skal derfor slå gruppas standardvariant.
		const [day, week] = canvas.getAllByRole("button");
		await expect(getComputedStyle(week).backgroundColor).not.toBe(
			getComputedStyle(day).backgroundColor,
		);

		await userEvent.click(canvas.getByRole("button", { name: "Måned" }));
		await expect(canvas.getByRole("button", { pressed: true })).toHaveAccessibleName("Måned");
		await expect(canvas.getByRole("button", { name: "Uke" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
	},
};

export const Keyboard: Story = {
	render: (args) => (
		<ButtonGroup {...args}>
			<Button>Dag</Button>
			<Button>Uke</Button>
			<Button>Måned</Button>
		</ButtonGroup>
	),
	play: async ({ canvas }) => {
		const [day, week, month] = canvas.getAllByRole("button");

		await userEvent.tab();
		await expect(day).toHaveFocus();
		await userEvent.tab();
		await expect(week).toHaveFocus();

		// Segmentene overlapper med -1px, så nabosegmentet males oppå
		// fokusringen om det fokuserte segmentet ikke løftes.
		const style = getComputedStyle(week);
		await expect(style.outlineWidth).toBe("2px");
		await expect(style.position).toBe("relative");
		await expect(style.zIndex).toBe("10");

		await userEvent.tab();
		await expect(month).toHaveFocus();
		// Løftet gjelder kun det fokuserte segmentet.
		await expect(getComputedStyle(week).zIndex).toBe("auto");
	},
};
