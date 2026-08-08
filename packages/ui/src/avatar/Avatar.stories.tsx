import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Avatar } from "./Avatar.tsx";

/*
 * Testbilde som datalenke. Stories kjøres i Chromium uten nett, og en ekte
 * bilde-URL ville gjort suiten flakete. Fargene her er testdata, ikke stil.
 */
const portrait =
	"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%234c64d9'/><circle cx='32' cy='25' r='12' fill='%23eef1ff'/><circle cx='32' cy='58' r='19' fill='%23eef1ff'/></svg>";

const meta: Meta<typeof Avatar> = {
	title: "Components/Avatar",
	component: Avatar,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { name: "Ada Lovelace" },
	argTypes: {
		size: { control: "inline-radio", options: ["xs", "sm", "md", "lg", "xl", "2xl"] },
		status: {
			control: "inline-radio",
			options: [undefined, "online", "busy", "away", "offline"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithInitials: Story = {
	play: async ({ canvas }) => {
		await expect(canvas.getByText("AL")).toBeInTheDocument();

		// Vaktpost: uten Tailwind er sirkelen ustilt og kontrastsjekken meningsløs.
		const surface = canvas.getByText("AL");
		await expect(getComputedStyle(surface).borderRadius).toBe("9999px");
	},
};

export const WithImage: Story = {
	args: { src: portrait, alt: "Ada Lovelace" },
	play: async ({ canvas }) => {
		const image = canvas.getByRole("img", { name: "Ada Lovelace" });
		await expect(image).toBeInTheDocument();
	},
};

export const Decorative: Story = {
	args: { src: portrait, alt: "" },
	parameters: { layout: "padded" },
	render: (args) => (
		<div className="flex items-center gap-3 font-sans text-body text-text-strong">
			<Avatar {...args} />
			<span>Ada Lovelace</span>
		</div>
	),
	play: async ({ canvas }) => {
		// Navnet står ved siden av. Bildet skal ikke gjenta det: alt="" gjør
		// det usynlig for skjermlesere, og da finnes ingen img-rolle.
		await expect(canvas.queryByRole("img")).toBeNull();
		await expect(canvas.getByText("Ada Lovelace")).toBeInTheDocument();
	},
};

export const WithoutName: Story = {
	args: { name: undefined, alt: "Ukjent bruker" },
	play: async ({ canvas }) => {
		// Faller tilbake til ikon når verken bilde eller navn finnes.
		await expect(canvas.getByRole("img", { name: "Ukjent bruker" })).toBeInTheDocument();
	},
};

export const Sizes: Story = {
	render: (args) => (
		<div className="flex items-end gap-3">
			{(["xs", "sm", "md", "lg", "xl", "2xl"] as const).map((size) => (
				<Avatar {...args} key={size} size={size} />
			))}
		</div>
	),
	play: async ({ canvas }) => {
		const avatars = canvas.getAllByRole("img", { name: "Ada Lovelace" });
		const boxes = avatars.map((a) => a.getBoundingClientRect());
		await expect(boxes.map((b) => b.height)).toEqual([24, 32, 40, 48, 56, 64]);
		// Sirkulær, ikke oval - bredden må følge høyden på hvert trinn.
		await expect(boxes.map((b) => b.width)).toEqual([24, 32, 40, 48, 56, 64]);

		// xs viser én initial. To fyller en 24px-sirkel helt ut, og smelter
		// sammen når avatarene overlapper i en AvatarGroup.
		await expect(avatars[0]).toHaveTextContent("A");
		await expect(avatars[1]).toHaveTextContent("AL");
	},
};

export const Statuses: Story = {
	render: (args) => (
		<div className="flex items-center gap-4">
			<Avatar {...args} name="Ada Lovelace" status="online" />
			<Avatar {...args} name="Grace Hopper" status="busy" />
			<Avatar {...args} name="Karen Spärck" status="away" />
			<Avatar {...args} name="Barbara Liskov" status="offline" />
		</div>
	),
	play: async ({ canvas }) => {
		// Statusprikken bærer mening. Den kan ikke være ren farge - da er den
		// borte både for skjermlesere og for fargeblinde.
		await expect(canvas.getByText("Pålogget")).toBeInTheDocument();
		await expect(canvas.getByText("Opptatt")).toBeInTheDocument();
		await expect(canvas.getByText("Borte")).toBeInTheDocument();
		await expect(canvas.getByText("Frakoblet")).toBeInTheDocument();
	},
};

export const StatusWithImage: Story = {
	args: { src: portrait, alt: "Ada Lovelace", status: "online", size: "xl" },
};

export const CustomStatusText: Story = {
	args: { status: "busy", statusLabel: "I møte til 14:00" },
	play: async ({ canvas }) => {
		await expect(canvas.getByText("I møte til 14:00")).toBeInTheDocument();
	},
};
