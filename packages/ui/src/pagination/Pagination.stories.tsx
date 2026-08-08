import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor } from "storybook/test";
import { Pagination, type PaginationProps } from "./Pagination.tsx";

const meta: Meta<typeof Pagination> = {
	title: "Components/Pagination",
	component: Pagination,
	parameters: { layout: "centered" },
	tags: ["autodocs"],
	args: { page: 3, total: 12 },
	argTypes: {
		page: { control: { type: "number", min: 1 } },
		total: { control: { type: "number", min: 1 } },
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getByRole("navigation", { name: "Paginering" })).toBeInTheDocument();

		// Tallet alene er ikke et tilgjengelig navn - "Side 3" er det.
		const current = canvas.getByRole("button", { name: "Side 3" });
		await expect(current).toHaveAttribute("aria-current", "page");

		// Forrige og neste har navn, ikke bare et pilikon.
		await expect(canvas.getByRole("button", { name: "Forrige side" })).toBeEnabled();
		await expect(canvas.getByRole("button", { name: "Neste side" })).toBeEnabled();

		// Åtte punkter i DOM-en - forrige, 1, 2, 3, 4, ellipse, 12, neste -
		// men ellipsen er dekorativ og teller ikke med i tilgjengelighetstreet.
		await expect(canvasElement.querySelectorAll("li")).toHaveLength(8);
		await expect(canvas.getAllByRole("listitem")).toHaveLength(7);
	},
};

export const FewPages: Story = {
	args: { page: 2, total: 5 },
	play: async ({ canvas }) => {
		// Under åtte sider vises alle, uten ellipse.
		await expect(canvas.getAllByRole("button")).toHaveLength(7);
	},
};

export const FirstPage: Story = {
	args: { page: 1, total: 12 },
	play: async ({ canvas }) => {
		const previous = canvas.getByRole("button", { name: "Forrige side" });
		await expect(previous).toBeDisabled();
		await expect(canvas.getByRole("button", { name: "Neste side" })).toBeEnabled();
	},
};

export const LastPage: Story = {
	args: { page: 12, total: 12 },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("button", { name: "Neste side" })).toBeDisabled();
	},
};

export const SinglePage: Story = {
	args: { page: 1, total: 1 },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("button", { name: "Forrige side" })).toBeDisabled();
		await expect(canvas.getByRole("button", { name: "Neste side" })).toBeDisabled();
	},
};

function InteractivePagination(props: PaginationProps) {
	const [page, setPage] = useState(props.page ?? 1);
	return (
		<div className="flex flex-col items-center gap-4">
			<Pagination {...props} onChange={setPage} page={page} />
			<p className="text-small text-text-weak">Viser side {page}</p>
		</div>
	);
}

export const Interactive: Story = {
	args: { page: 3, total: 12 },
	render: (args) => <InteractivePagination {...args} />,
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Neste side" }));
		await waitFor(() => expect(canvas.getByText("Viser side 4")).toBeInTheDocument());

		await userEvent.click(canvas.getByRole("button", { name: "Side 12" }));
		await waitFor(() => expect(canvas.getByText("Viser side 12")).toBeInTheDocument());
		await expect(canvas.getByRole("button", { name: "Neste side" })).toBeDisabled();
	},
};
