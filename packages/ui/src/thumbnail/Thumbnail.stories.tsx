import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Thumbnail } from "./Thumbnail.tsx";

/*
 * Testbilde som datalenke. Stories kjøres i Chromium uten nett, og en ekte
 * bilde-URL ville gjort suiten flakete. Fargene her er testdata, ikke stil.
 */
const landscape =
	"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 120'><rect width='160' height='120' fill='%23dbe1f7'/><circle cx='124' cy='30' r='14' fill='%23fec62e'/><path d='M0 120 52 54l38 44 24-24 46 46z' fill='%234c64d9'/></svg>";

const meta: Meta<typeof Thumbnail> = {
	title: "Components/Thumbnail",
	component: Thumbnail,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { src: landscape, alt: "Fjellandskap ved solnedgang", width: 160 },
	argTypes: {
		ratio: { control: "inline-radio", options: ["1/1", "4/3", "3/2", "16/9"] },
		radius: { control: "inline-radio", options: [4, 8, 12, 16, 24] },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		const image = canvas.getByRole("img", { name: "Fjellandskap ved solnedgang" });
		await expect(image).toBeInTheDocument();

		// Kvadratisk som standard, og hjørnene skal være avrundet.
		const tile = image.parentElement as HTMLElement;
		const box = tile.getBoundingClientRect();
		await expect(box.width).toBe(160);
		await expect(box.height).toBe(160);
		await expect(getComputedStyle(tile).borderTopLeftRadius).toBe("12px");
	},
};

export const WithoutImage: Story = {
	args: { src: undefined },
	play: async ({ canvas }) => {
		// Manglende bilde skal ikke gi et tomt hull uten navn.
		await expect(
			canvas.getByRole("img", { name: "Fjellandskap ved solnedgang" }),
		).toBeInTheDocument();
	},
};

export const WithoutImageOrText: Story = {
	args: { src: undefined, alt: "" },
	play: async ({ canvas }) => {
		// Rent dekorativ plassholder. Da skal den være stum.
		await expect(canvas.queryByRole("img")).toBeNull();
	},
};

export const AspectRatios: Story = {
	render: (args) => (
		<div className="flex items-start gap-4">
			{(["1/1", "4/3", "3/2", "16/9"] as const).map((ratio) => (
				<Thumbnail {...args} key={ratio} ratio={ratio} width={120} />
			))}
		</div>
	),
	play: async ({ canvas }) => {
		const tiles = canvas.getAllByRole("img").map((image) => image.parentElement as HTMLElement);
		const ratios = tiles.map((tile) => {
			const box = tile.getBoundingClientRect();
			return Math.round((box.width / box.height) * 100) / 100;
		});
		await expect(ratios).toEqual([1, 1.33, 1.5, 1.78]);
	},
};

export const Radius: Story = {
	render: (args) => (
		<div className="flex items-start gap-4">
			{([4, 8, 12, 16, 24] as const).map((r) => (
				<Thumbnail {...args} key={r} radius={r} width={96} />
			))}
		</div>
	),
	play: async ({ canvas }) => {
		const tiles = canvas.getAllByRole("img").map((image) => image.parentElement as HTMLElement);
		const radii = tiles.map((tile) => getComputedStyle(tile).borderTopLeftRadius);
		await expect(radii).toEqual(["4px", "8px", "12px", "16px", "24px"]);
	},
};

export const FullWidth: Story = {
	args: { width: undefined, ratio: "16/9" },
	parameters: { layout: "padded" },
};
