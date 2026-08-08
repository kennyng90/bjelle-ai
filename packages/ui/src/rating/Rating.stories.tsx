import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent } from "storybook/test";
import { Rating, type RatingProps } from "./Rating.tsx";

const meta: Meta<typeof Rating> = {
	title: "Components/Rating",
	component: Rating,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Stjernevurdering i to moduser som oppfører seg helt ulikt.\n\n" +
					"**Skrivebeskyttet** (standard) er tekst. Stjernene er dekorasjon med " +
					'`aria-hidden`, og verdien leses som "4,5 av 5 stjerner". Halve stjerner ' +
					"gir riktig tekstverdi. Ingenting her kan fokuseres eller klikkes.\n\n" +
					'**Interaktiv** (`readOnly={false}`) er en radiogruppe: `role="radiogroup"` ' +
					'med én `role="radio"` per stjerne, roving tabindex og piltaster. Gruppa ' +
					"tar én tabulator, piltastene flytter og velger, Home og End går til " +
					"endene. Interaktiv modus krever `label` og `onChange`, og støtter kun " +
					"hele stjerner.\n\n" +
					"Interaktiv modus er en øy: i `apps/web` må den monteres med " +
					"`client:visible` (eller `client:load` er den over folden). Uten " +
					"client-direktiv rendres stjernene som statisk HTML og ingenting kan velges.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		size: { control: "inline-radio", options: ["sm", "md", "lg"] },
		className: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadOnly: Story = {
	args: { value: 4 },
	play: async ({ canvas }) => {
		const text = canvas.getByText("4 av 5 stjerner");
		// Stjernene er dekorasjon; verdien bæres av teksten. Er de ikke skjult,
		// leses "stjerne stjerne stjerne stjerne stjerne" i tillegg.
		await expect(text.previousElementSibling).toHaveAttribute("aria-hidden", "true");
		// Skrivebeskyttet visning er tekst, ikke kontroller.
		await expect(canvas.queryByRole("radiogroup")).toBeNull();
		await expect(canvas.queryAllByRole("radio")).toHaveLength(0);
	},
};

export const HalfStar: Story = {
	args: { value: 4.5 },
	play: async ({ canvas }) => {
		// Norsk desimalkomma, ikke punktum.
		await expect(canvas.getByText("4,5 av 5 stjerner")).toBeInTheDocument();
	},
};

export const WithVisibleValue: Story = {
	args: { value: 3.5, showValueText: true },
	play: async ({ canvas }) => {
		await expect(canvas.getByText("3,5 av 5 stjerner")).toBeVisible();
	},
};

export const Empty: Story = {
	args: { value: 0 },
	play: async ({ canvas }) => {
		await expect(canvas.getByText("0 av 5 stjerner")).toBeInTheDocument();
	},
};

export const Sizes: Story = {
	args: { value: 3.5 },
	render: (args) => (
		<div className="flex flex-col items-start gap-4">
			<Rating {...args} size="sm" />
			<Rating {...args} size="md" />
			<Rating {...args} size="lg" />
		</div>
	),
};

function InteractiveRating({ value = 0, onChange, ...args }: RatingProps) {
	const [selected, setSelected] = useState(value);

	return (
		<Rating
			{...args}
			onChange={(next) => {
				setSelected(next);
				onChange?.(next);
			}}
			readOnly={false}
			value={selected}
		/>
	);
}

export const Interactive: Story = {
	args: { label: "Vurder artikkelen", value: 3, onChange: fn(), readOnly: false },
	render: (args) => <InteractiveRating {...args} />,
	play: async ({ args, canvas }) => {
		const group = canvas.getByRole("radiogroup", { name: "Vurder artikkelen" });
		await expect(group).toBeInTheDocument();

		const stars = canvas.getAllByRole("radio");
		await expect(stars).toHaveLength(5);
		await expect(stars[2]).toHaveAttribute("aria-checked", "true");

		// Roving tabindex: gruppa koster én tabulator, ikke fem.
		await expect(stars[2]).toHaveAttribute("tabindex", "0");
		await expect(stars[0]).toHaveAttribute("tabindex", "-1");
		await expect(stars[4]).toHaveAttribute("tabindex", "-1");

		stars[2].focus();

		await userEvent.keyboard("{ArrowRight}");
		await expect(stars[3]).toHaveFocus();
		await expect(stars[3]).toHaveAttribute("aria-checked", "true");
		await expect(stars[2]).toHaveAttribute("aria-checked", "false");
		await expect(args.onChange).toHaveBeenCalledWith(4);

		await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
		await expect(stars[1]).toHaveFocus();
		await expect(stars[1]).toHaveAttribute("aria-checked", "true");

		await userEvent.keyboard("{End}");
		await expect(stars[4]).toHaveFocus();
		await expect(stars[4]).toHaveAttribute("aria-checked", "true");

		// Wrap: fra siste med pil høyre går det rundt til første.
		await userEvent.keyboard("{ArrowRight}");
		await expect(stars[0]).toHaveAttribute("aria-checked", "true");

		await userEvent.keyboard("{End}{Home}");
		await expect(stars[0]).toHaveFocus();
		await expect(stars[0]).toHaveAttribute("aria-checked", "true");

		// Fokusringen må være vår egen, ikke nettleserens standard: 2 px med
		// 2 px avstand, i fokusfargen. `outlineWidth != 0` holder ikke som
		// sjekk - Chromium tegner sin egen ring uansett.
		const ring = getComputedStyle(stars[0]);
		await expect(ring.outlineWidth).toBe("2px");
		await expect(ring.outlineOffset).toBe("2px");
		await expect(ring.outlineStyle).not.toBe("none");
	},
};

export const InteractiveWithMouse: Story = {
	args: { label: "Vurder artikkelen", value: 0, onChange: fn(), readOnly: false },
	render: (args) => <InteractiveRating {...args} />,
	play: async ({ args, canvas }) => {
		// Axe krever ikke navn på en radiogruppe, så den sjekken må stå her.
		await expect(canvas.getByRole("radiogroup", { name: "Vurder artikkelen" })).toBeVisible();

		const stars = canvas.getAllByRole("radio");
		// Ingen valgt verdi: første stjerne er inngangen til gruppa.
		await expect(stars[0]).toHaveAttribute("tabindex", "0");

		await userEvent.click(stars[3]);
		await expect(args.onChange).toHaveBeenCalledWith(4);
		await expect(stars[3]).toHaveAttribute("aria-checked", "true");
		await expect(canvas.getByRole("radio", { name: "4 av 5 stjerner" })).toBeInTheDocument();
	},
};
