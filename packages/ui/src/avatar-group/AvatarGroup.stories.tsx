import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { AvatarGroup } from "./AvatarGroup.tsx";

/*
 * Testbilde som datalenke. Stories kjøres i Chromium uten nett, og en ekte
 * bilde-URL ville gjort suiten flakete. Fargene her er testdata, ikke stil.
 */
const portrait =
	"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%234c64d9'/><circle cx='32' cy='25' r='12' fill='%23eef1ff'/><circle cx='32' cy='58' r='19' fill='%23eef1ff'/></svg>";

const names = [
	"Ada Lovelace",
	"Grace Hopper",
	"Karen Spärck",
	"Barbara Liskov",
	"Radia Perlman",
	"Frances Allen",
];

const meta: Meta<typeof AvatarGroup> = {
	title: "Components/AvatarGroup",
	component: AvatarGroup,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { label: "Deltakere", avatars: names.slice(0, 3) },
	argTypes: {
		size: { control: "inline-radio", options: ["xs", "sm", "md", "lg"] },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const list = canvas.getByRole("list", { name: "Deltakere" });
		await expect(list).toBeInTheDocument();

		// Overlappet er visuelt. Leserekkefølgen skal fortsatt være DOM-rekkefølgen.
		const items = canvas.getAllByRole("listitem");
		await expect(items).toHaveLength(3);
		await expect(items.map((p) => p.textContent)).toEqual(["AL", "GH", "KS"]);

		// Vaktpost: uten Tailwind er det ingen overlapp å snakke om.
		await expect(getComputedStyle(items[1]).marginLeft).toBe("-12px");
		await expect(getComputedStyle(items[0]).marginLeft).toBe("0px");

		// Punktet må være nøyaktig like høyt som avataren. Er det en linjeboks,
		// vokser det med descenderen og skilleringen blir en oval.
		for (const item of items) {
			const box = item.getBoundingClientRect();
			await expect([box.width, box.height]).toEqual([40, 40]);
		}
	},
};

export const WithOverflow: Story = {
	args: { avatars: names, max: 4 },
	play: async ({ canvas }) => {
		const items = canvas.getAllByRole("listitem");
		await expect(items).toHaveLength(5);

		// "+2" alene er dårlig opplest. Tallet skal ha en tekstlig motpart.
		await expect(canvas.getByText("+2")).toBeInTheDocument();
		await expect(canvas.getByText("2 flere")).toBeInTheDocument();
	},
};

export const WithImages: Story = {
	args: {
		avatars: [
			{ name: "Ada Lovelace", src: portrait },
			{ name: "Grace Hopper", src: portrait },
			{ name: "Karen Spärck" },
		],
	},
	play: async ({ canvas }) => {
		// I en gruppe står ingen navn ved siden av. Da er avataren eneste
		// bærer av identiteten og må ha et tilgjengelig navn.
		await expect(canvas.getByRole("img", { name: "Ada Lovelace" })).toBeInTheDocument();
		await expect(canvas.getByRole("img", { name: "Karen Spärck" })).toBeInTheDocument();
	},
};

export const WithStatus: Story = {
	args: {
		avatars: [
			{ name: "Ada Lovelace", status: "online" as const },
			{ name: "Grace Hopper", status: "busy" as const },
			{ name: "Karen Spärck", status: "away" as const },
		],
	},
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex flex-col items-start gap-4">
			{(["xs", "sm", "md", "lg"] as const).map((size) => (
				<AvatarGroup {...args} key={size} label={`Deltakere ${size}`} size={size} />
			))}
		</div>
	),
	play: async ({ canvas }) => {
		// Alle fire trinnene skal være kvadratiske, også det minste - der slo
		// linjeboksen til først.
		const expected = [24, 32, 40, 48];
		const groups = canvas.getAllByRole("list");
		for (const [i, group] of groups.entries()) {
			for (const item of group.querySelectorAll("li")) {
				const box = item.getBoundingClientRect();
				await expect([box.width, box.height]).toEqual([expected[i], expected[i]]);
			}
		}
	},
};

export const Empty: Story = {
	args: { avatars: [] },
	play: async ({ canvas }) => {
		await expect(canvas.queryAllByRole("listitem")).toHaveLength(0);
	},
};
