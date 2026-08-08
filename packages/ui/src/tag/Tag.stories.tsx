import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent } from "storybook/test";
import { Tag, type TagProps } from "./Tag.tsx";

const meta: Meta<typeof Tag> = {
	title: "Components/Tag",
	component: Tag,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { children: "Oslo Børs" },
	argTypes: {
		size: { control: "inline-radio", options: ["sm", "md"] },
		leadingIcon: { control: false },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

function ClickableDemo(props: TagProps) {
	const [selected, setSelected] = useState(false);
	return <Tag {...props} onClick={() => setSelected((v) => !v)} selected={selected} />;
}

function FilterGroupDemo() {
	const all = ["Aksjer", "Fond", "Renter", "Valuta"];
	const [selected, setSelected] = useState<string[]>(["Aksjer"]);
	return (
		<ul className="flex list-none flex-wrap items-center gap-2 p-0">
			{all.map((name) => (
				<li key={name}>
					<Tag
						onClick={() =>
							setSelected((v) => (v.includes(name) ? v.filter((n) => n !== name) : [...v, name]))
						}
						selected={selected.includes(name)}
					>
						{name}
					</Tag>
				</li>
			))}
		</ul>
	);
}

export const Default: Story = {
	play: async ({ canvas }) => {
		// Vaktpost, ikke en test av merkelappen: uten Tailwind i testoppsettet
		// finnes det ingen kant å måle, og enhver kontrastsjekk består trivielt.
		const border = getComputedStyle(canvas.getByText("Oslo Børs")).borderTopWidth;
		await expect(border).toBe("1px");
	},
};

export const Selected: Story = { args: { selected: true, onClick: fn() } };

export const Sizes: Story = {
	render: (args) => (
		<div className="flex items-center gap-2">
			<Tag {...args} size="sm" />
			<Tag {...args} size="md" />
		</div>
	),
};

export const WithIcon: Story = {
	args: { leadingIcon: "Tag" },
};

/**
 * Klikkbar merkelapp. Tilstanden ligger i `aria-pressed`, og valgt tilstand
 * får i tillegg et hakeikon - den formidles ikke med farge alene.
 */
export const Clickable: Story = {
	render: (args) => <ClickableDemo {...args} />,
	play: async ({ canvas }) => {
		const button = canvas.getByRole("button", { name: "Oslo Børs" });
		await expect(button).toHaveAttribute("aria-pressed", "false");
		await expect(button.querySelector("svg")).toBeNull();

		await userEvent.click(button);
		await expect(button).toHaveAttribute("aria-pressed", "true");
		await expect(button.querySelector("svg")).not.toBeNull();
	},
};

/**
 * Fjern-knappen er en ekte knapp med et navn som sier hva som fjernes, ikke
 * bare "Fjern". Den må nås med Tab og utløses med tastatur.
 */
export const Removable: Story = {
	args: { onRemove: fn() },
	play: async ({ args, canvas }) => {
		const remove = canvas.getByRole("button", { name: "Fjern Oslo Børs" });

		// 24x24 CSS-piksler er minstemålet i WCAG 2.2 (2.5.8 Target Size).
		const box = remove.getBoundingClientRect();
		await expect(box.width).toBeGreaterThanOrEqual(24);
		await expect(box.height).toBeGreaterThanOrEqual(24);

		await userEvent.tab();
		await expect(remove).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		await expect(args.onRemove).toHaveBeenCalled();
	},
};

/**
 * Både klikkbar og fjernbar. Da er merkelappen to separate mål: etiketten
 * velger, knappen fjerner. Begge nås med Tab hver for seg, og fjerning skal
 * ikke boble opp som et valg.
 */
export const ClickableAndRemovable: Story = {
	args: { onClick: fn(), onRemove: fn(), selected: true },
	play: async ({ args, canvas }) => {
		await userEvent.tab();
		const label = canvas.getByRole("button", { name: "Oslo Børs" });
		await expect(label).toHaveFocus();

		// Fokusringen ligger på ::after, som strekkes over hele brikken. Den er
		// hele poenget med konstruksjonen, så den måles i stedet for å antas.
		const ring = getComputedStyle(label, "::after");
		await expect(ring.outlineStyle).not.toBe("none");
		await expect(ring.outlineWidth).toBe("2px");

		await userEvent.keyboard("{Enter}");
		await expect(args.onClick).toHaveBeenCalledTimes(1);

		await userEvent.tab();
		const remove = canvas.getByRole("button", { name: "Fjern Oslo Børs" });
		await expect(remove).toHaveFocus();
		await expect(getComputedStyle(remove).outlineWidth).toBe("2px");
		await userEvent.keyboard("{Enter}");
		await expect(args.onRemove).toHaveBeenCalledTimes(1);
		await expect(args.onClick).toHaveBeenCalledTimes(1);
	},
};

export const FilterGroup: Story = {
	render: () => <FilterGroupDemo />,
};

export const DarkTheme: Story = {
	globals: { theme: "dark" },
	args: { onRemove: fn() },
	render: (args) => (
		<div className="flex items-center gap-2">
			<Tag {...args} />
			<Tag {...args} onClick={fn()} selected />
			<Tag {...args} leadingIcon="Tag" size="sm" />
		</div>
	),
};
