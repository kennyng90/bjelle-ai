import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { Tabs, type TabsProps } from "./Tabs.tsx";

const tabs = [
	{ value: "alle", label: "Alle", badge: 24, content: "Alle saker i køen, uansett status." },
	{ value: "apne", label: "Åpne", badge: 8, content: "Saker som venter på svar fra oss." },
	{ value: "lukkede", label: "Lukkede", content: "Saker som ble avsluttet de siste 30 dagene." },
];

const meta: Meta<typeof Tabs> = {
	title: "Components/Tabs",
	component: Tabs,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
	args: { tabs, label: "Saksfiltre" },
	argTypes: {
		variant: { control: "inline-radio", options: ["underline", "pill"] },
		// Innholdet er demodata, ikke noe designeren skal skru på i kontrollpanelet.
		tabs: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Underline: Story = {
	play: async ({ canvas }) => {
		// Vaktpost, ikke en test av fanene: fanger at Tailwind har falt ut av
		// testoppsettet. Uten stiler består enhver kontrastsjekk trivielt.
		const tablist = canvas.getByRole("tablist");
		await expect(getComputedStyle(tablist).borderBottomWidth).toBe("1px");

		const panels = canvas.getAllByRole("tabpanel");
		// Kun det valgte panelet finnes i tilgjengelighetstreet.
		await expect(panels).toHaveLength(1);
		// Panelet arver navnet fra fanen sin, teller inkludert.
		await expect(panels[0]).toHaveAccessibleName("Alle 24");
	},
};

export const Pills: Story = { args: { variant: "pill" } };

export const WithIcons: Story = {
	args: {
		tabs: [
			{ value: "innboks", label: "Innboks", icon: "Inbox", content: "12 nye meldinger." },
			{ value: "arkiv", label: "Arkiv", icon: "Archive", content: "Ingenting arkivert ennå." },
			{
				value: "innstillinger",
				label: "Innstillinger",
				icon: "Settings",
				content: "Varsling og språk.",
			},
		],
	},
};

export const WithoutPanels: Story = {
	args: { tabs: ["Oversikt", "Aktivitet", "Medlemmer"] },
	play: async ({ canvas }) => {
		// Uten innhold skal ingen fane peke på et panel som ikke finnes.
		await expect(canvas.queryAllByRole("tabpanel")).toHaveLength(0);
		await expect(canvas.getAllByRole("tab")[0]).not.toHaveAttribute("aria-controls");
	},
};

function ControlledTabs(props: TabsProps) {
	const [value, setValue] = useState("apne");
	return (
		<div className="flex flex-col gap-4">
			<Tabs {...props} onChange={setValue} value={value} />
			<p className="text-small text-text-weak">Valgt fane: {value}</p>
		</div>
	);
}

export const Controlled: Story = {
	render: (args) => <ControlledTabs {...args} />,
	play: async ({ canvas }) => {
		await expect(canvas.getByText("Valgt fane: apne")).toBeInTheDocument();
		await userEvent.click(canvas.getByRole("tab", { name: "Lukkede" }));
		await waitFor(() => expect(canvas.getByText("Valgt fane: lukkede")).toBeInTheDocument());
	},
};

export const KeyboardNavigation: Story = {
	play: async ({ canvas }) => {
		const [first, second, last] = canvas.getAllByRole("tab");

		// Roving tabindex: kun den valgte fanen ligger i tabrekkefølgen.
		await expect(first).toHaveAttribute("aria-selected", "true");
		await expect(first).toHaveAttribute("tabindex", "0");
		await expect(second).toHaveAttribute("tabindex", "-1");

		// Fokusflyttingen skjer i tastaturhandleren, men React commit'er først
		// etterpå. waitFor lar assertionen vente på commit i stedet for å
		// bomme når maskinen er treg.
		await userEvent.tab();
		await waitFor(() => expect(first).toHaveFocus());

		await userEvent.keyboard("{ArrowRight}");
		await waitFor(() => expect(second).toHaveFocus());
		await expect(second).toHaveAttribute("aria-selected", "true");
		await expect(first).toHaveAttribute("aria-selected", "false");
		await expect(canvas.getByRole("tabpanel")).toHaveAccessibleName("Åpne 8");

		await userEvent.keyboard("{End}");
		await waitFor(() => expect(last).toHaveFocus());

		// Høyre fra siste går rundt til første.
		await userEvent.keyboard("{ArrowRight}");
		await waitFor(() => expect(first).toHaveFocus());

		await userEvent.keyboard("{ArrowLeft}");
		await waitFor(() => expect(last).toHaveFocus());

		await userEvent.keyboard("{Home}");
		await waitFor(() => expect(first).toHaveFocus());
		await expect(first).toHaveAttribute("aria-selected", "true");
	},
};
