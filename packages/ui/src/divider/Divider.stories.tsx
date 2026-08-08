import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Divider } from "./Divider.tsx";

const meta: Meta<typeof Divider> = {
	title: "Components/Divider",
	component: Divider,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
	argTypes: {
		orientation: { control: "inline-radio", options: ["horizontal", "vertical"] },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => (
		<div className="font-sans text-body text-text-strong">
			<p className="pb-4">Rapporten ble oppdatert i går.</p>
			<Divider {...args} />
			<p className="pt-4">Neste kjøring starter klokka 06:00.</p>
		</div>
	),
	play: async ({ canvas }) => {
		const separator = canvas.getByRole("separator");
		await expect(separator.tagName).toBe("HR");
		// Hårstrek, ikke ramme. Uten Tailwind blir dette 0px og linja usynlig.
		await expect(separator.getBoundingClientRect().height).toBe(1);
	},
};

export const WithText: Story = {
	args: { label: "Eller" },
	render: (args) => (
		<div className="font-sans text-body text-text-strong">
			<p className="pb-4">Logg inn med e-post.</p>
			<Divider {...args} />
			<p className="pt-4">Logg inn med engangskode.</p>
		</div>
	),
	play: async ({ canvas }) => {
		// role="separator" gjør barna presentasjonelle, så den synlige teksten
		// alene ville vært stum. Navnet må komme fra aria-label.
		const separator = canvas.getByRole("separator", { name: "Eller" });
		await expect(separator).toBeInTheDocument();
		await expect(canvas.getByText("Eller")).toBeInTheDocument();
	},
};

export const Vertical: Story = {
	args: { orientation: "vertical" },
	render: (args) => (
		<div className="flex items-center gap-4 font-sans text-body text-text-strong">
			<span>Utkast</span>
			<Divider {...args} />
			<span>Publisert</span>
			<Divider {...args} />
			<span>Arkivert</span>
		</div>
	),
	play: async ({ canvas }) => {
		const separator = canvas.getAllByRole("separator")[0];
		await expect(separator).toHaveAttribute("aria-orientation", "vertical");
		const box = separator.getBoundingClientRect();
		await expect(box.width).toBe(1);
		// Strekker seg over hele radhøyden, ellers henger den i lufta.
		await expect(box.height).toBeGreaterThan(1);
	},
};

export const Decorative: Story = {
	args: { decorative: true },
	render: (args) => (
		<div className="font-sans text-body text-text-strong">
			<p className="pb-4">Dekorasjon mellom to avsnitt som allerede er skilt av annet.</p>
			<Divider {...args} />
			<p className="py-4">Skillelinja skal da ikke støye i skjermleseren.</p>
			<Divider {...args} label="Heller ikke med tekst" />
			<p className="pt-4">Det gjelder også den merkede varianten.</p>
		</div>
	),
	play: async ({ canvas }) => {
		await expect(canvas.queryAllByRole("separator")).toHaveLength(0);
		// Teksten er fortsatt synlig, den er bare ikke et separator lenger.
		await expect(canvas.getByText("Heller ikke med tekst")).toBeVisible();
	},
};
