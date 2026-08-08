import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import { Table, type TableColumn } from "./Table.tsx";

interface Employee {
	id: string;
	name: string;
	email: string;
	department: string;
	hours: number;
}

const employees: Employee[] = [
	{
		id: "1",
		name: "Olivia Strand",
		email: "olivia.strand@bjelle.no",
		department: "Design",
		hours: 148,
	},
	{ id: "2", name: "Are Wold", email: "are.wold@bjelle.no", department: "Utvikling", hours: 162 },
	{ id: "3", name: "Emma Lie", email: "emma.lie@bjelle.no", department: "Salg", hours: 134 },
	{
		id: "4",
		name: "Kasper Nyland",
		email: "kasper.nyland@bjelle.no",
		department: "Utvikling",
		hours: 171,
	},
];

const columns: TableColumn<Employee>[] = [
	{ key: "name", header: "Navn", sortable: true },
	{ key: "email", header: "E-post" },
	{ key: "department", header: "Avdeling" },
	{
		key: "hours",
		header: "Timer",
		align: "right",
		sortable: true,
		render: (row) => <span className="tabular-nums">{row.hours}</span>,
	},
];

const meta: Meta<typeof Table<Employee>> = {
	title: "Components/Table",
	component: Table,
	parameters: { layout: "padded" },
	tags: ["autodocs"],
	args: {
		caption: "Timer ført denne måneden",
		columns,
		rows: employees,
	},
	argTypes: {
		sortDir: { control: "inline-radio", options: ["asc", "desc"] },
		// Arvet fra HTMLAttributes. Ikke noe designeren skal skru på.
		role: { table: { disable: true } },
		tabIndex: { table: { disable: true } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas, canvasElement }) => {
		// Ekte tabellsemantikk, ikke div-er.
		await expect(canvas.getByRole("table")).toBeVisible();
		await expect(canvas.getAllByRole("columnheader")).toHaveLength(4);
		for (const th of canvasElement.querySelectorAll("th")) {
			await expect(th).toHaveAttribute("scope", "col");
		}
		// Tabellen har tilgjengelig navn via <caption>.
		await expect(canvas.getByRole("table", { name: "Timer ført denne måneden" })).toBeVisible();
		// Rulleområdet er en navngitt region som kan nås med tastatur.
		const region = canvas.getByRole("region", { name: "Timer ført denne måneden" });
		await expect(region).toHaveAttribute("tabindex", "0");
		// Vaktpost: uten Tailwind er hodet like lyst som resten.
		const head = canvasElement.querySelector("thead tr");
		if (!head) throw new Error("Fant ikke tabellhodet");
		await expect(getComputedStyle(head).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
	},
};

function SortableTable() {
	const [sortKey, setSortKey] = useState<keyof Employee | undefined>(undefined);
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

	const rows = sortKey
		? [...employees].sort((a, b) => {
				const x = a[sortKey];
				const y = b[sortKey];
				const order =
					typeof x === "number" && typeof y === "number"
						? x - y
						: String(x).localeCompare(String(y), "nb");
				return sortDir === "asc" ? order : -order;
			})
		: employees;

	return (
		<Table
			caption="Timer ført denne måneden"
			columns={columns}
			onSort={(key) => {
				if (key === sortKey) {
					setSortDir(sortDir === "asc" ? "desc" : "asc");
				} else {
					setSortKey(key as keyof Employee);
					setSortDir("asc");
				}
			}}
			rows={rows}
			sortDir={sortDir}
			sortKey={sortKey}
		/>
	);
}

export const Sorting: Story = {
	render: () => <SortableTable />,
	play: async ({ canvas }) => {
		const column = canvas.getByRole("columnheader", { name: /Navn/ });
		await expect(column).toHaveAttribute("aria-sort", "none");

		// Sorteringen ligger på en knapp inne i overskriften, ikke på <th>, og
		// knappen nås med tastatur. Første tabstopp er rulleområdet.
		const button = canvas.getByRole("button", { name: /Navn/ });
		await userEvent.tab();
		await userEvent.tab();
		await expect(button).toHaveFocus();
		await expect(getComputedStyle(button).outlineWidth).toBe("2px");

		await userEvent.keyboard("{Enter}");
		await expect(column).toHaveAttribute("aria-sort", "ascending");
		await expect(canvas.getAllByRole("cell")[0]).toHaveTextContent("Are Wold");

		await userEvent.click(button);
		await expect(column).toHaveAttribute("aria-sort", "descending");
		await expect(canvas.getAllByRole("cell")[0]).toHaveTextContent("Olivia Strand");
	},
};

export const SortedColumn: Story = {
	// Radene er sortert som overskriften lover. En tabell som sier
	// "synkende" og viser noe annet, er verre enn ingen indikator.
	args: {
		sortKey: "hours",
		sortDir: "desc",
		rows: [...employees].sort((a, b) => b.hours - a.hours),
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("columnheader", { name: /Timer/ })).toHaveAttribute(
			"aria-sort",
			"descending",
		);
		await expect(canvas.getByRole("columnheader", { name: /Navn/ })).toHaveAttribute(
			"aria-sort",
			"none",
		);
	},
};

export const CustomCells: Story = {
	args: {
		columns: [
			{ key: "name", header: "Navn", sortable: true },
			{ key: "department", header: "Avdeling" },
			{
				key: "status",
				header: "Status",
				align: "right",
				render: (row: Employee) => (
					<span
						className={
							row.hours >= 150
								? "inline-flex items-center gap-1.5 rounded-full bg-fill-success-weak px-3 py-1 text-small font-medium text-text-success"
								: "inline-flex items-center gap-1.5 rounded-full bg-fill-warning-weak px-3 py-1 text-small font-medium text-text-warning"
						}
					>
						{row.hours >= 150 ? "Godkjent" : "Til vurdering"}
					</span>
				),
			},
		],
	},
};

export const Empty: Story = {
	args: { rows: [], emptyState: "Ingen timer er ført denne måneden." },
	play: async ({ canvas }) => {
		await expect(canvas.getByText("Ingen timer er ført denne måneden.")).toBeVisible();
	},
};

function TableWithRowSelection() {
	const [selected, setSelected] = useState<string[]>([]);

	const withSelection: TableColumn<Employee>[] = [
		{
			key: "select",
			width: 56,
			header: <span className="sr-only">Velg rad</span>,
			render: (row) => (
				<input
					aria-label={`Velg ${row.name}`}
					checked={selected.includes(row.id)}
					// `block`: som inline-innhold får boksen descender-plass under seg i
					// linjeboksen, og da står den tre piksler høyere enn teksten i
					// naboene sine. Som blokk midtstiller cella den mot radhøyden.
					className="block size-5 accent-fill-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stroke-focus"
					onChange={(event) =>
						setSelected((previous) =>
							event.target.checked ? [...previous, row.id] : previous.filter((id) => id !== row.id),
						)
					}
					type="checkbox"
				/>
			),
		},
		...columns,
	];

	return (
		<Table
			caption={`Timer ført denne måneden (${selected.length} valgt)`}
			columns={withSelection}
			rows={employees}
		/>
	);
}

export const RowSelection: Story = {
	render: () => <TableWithRowSelection />,
	play: async ({ canvas }) => {
		// Hver avkryssingsboks har sin egen etikett - ellers er de fire like.
		const box = canvas.getByRole("checkbox", { name: "Velg Emma Lie" });
		await userEvent.click(box);
		await expect(box).toBeChecked();
		await expect(canvas.getByRole("table", { name: /1 valgt/ })).toBeVisible();
	},
};

export const HorizontalScroll: Story = {
	render: (args) => (
		<div className="w-64">
			<Table {...args} />
		</div>
	),
	play: async ({ canvas }) => {
		const region = canvas.getByRole("region", { name: "Timer ført denne måneden" });
		await expect(region.scrollWidth).toBeGreaterThan(region.clientWidth);
		// Et rulleområde som bare kan rulles med mus, er ikke tilgjengelig.
		await userEvent.tab();
		await expect(region).toHaveFocus();
		await expect(getComputedStyle(region).outlineWidth).toBe("2px");
	},
};

export const HiddenTitle: Story = {
	args: { captionHidden: true },
	play: async ({ canvas, canvasElement }) => {
		// Tittelen kan skjules visuelt, men navnet må bli igjen i tilgjengelighetstreet.
		await expect(canvas.getByRole("table", { name: "Timer ført denne måneden" })).toBeVisible();
		await expect(canvas.getByRole("region", { name: "Timer ført denne måneden" })).toBeVisible();
		const caption = canvasElement.querySelector("caption");
		if (!caption) throw new Error("Fant ikke tabelltittelen");
		await expect(caption.getBoundingClientRect().height).toBeLessThan(2);
	},
};
