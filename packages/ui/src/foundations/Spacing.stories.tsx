import type { Meta, StoryObj } from "@storybook/react-vite";
import { Page, Section } from "./layout.tsx";

/**
 * Rytmen i designsystemet: avstand, hjørner og høyde over flaten.
 *
 * Alle tre henger sammen - de avgjør hvor romslig grensesnittet føles - og
 * står derfor på samme side.
 */
const meta: Meta = {
	title: "Foundations/Spacing",
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

const SPACING = [
	["0.5", 2],
	["1", 4],
	["2", 8],
	["3", 12],
	["4", 16],
	["5", 20],
	["6", 24],
	["8", 32],
	["10", 40],
	["12", 48],
	["16", 64],
	["20", 80],
	["24", 96],
] as const;

const RADIUS = [
	["rounded-4", "Små brikker"],
	["rounded-8", "Kontroller: knapper, felt"],
	["rounded-12", "Kort"],
	["rounded-16", "Kort og paneler"],
	["rounded-20", "Store flater"],
	["rounded-24", "Store flater"],
	["rounded-32", "Seksjoner"],
	["rounded-full", "Piller, avatarer, merkelapper"],
];

const SHADOWS = [
	["shadow-xs", "Hårfin heving, sekundærknapp"],
	["shadow-sm", "Så vidt løftet"],
	["shadow-md", "Kort - det vanligste"],
	["shadow-lg", "Popover, nedtrekk"],
	["shadow-xl", "Modal, skuff"],
];

function Content() {
	return (
		<Page>
			<Section
				title="Spacing"
				description="4px-rutenett. Tallet i klassen ganges med 4px, så p-6 er 24px. Kortluft 24, feltavstand 16-24, seksjonsluft 80. Ligger noe utenfor rutenettet er det som regel en feil."
			>
				<ul className="space-y-2">
					{SPACING.map(([step, px]) => (
						<li key={step} className="flex items-center gap-4">
							<code className="w-16 shrink-0 font-mono text-tiny text-text-weak">{step}</code>
							<span className="w-12 shrink-0 text-tiny text-text-weak">{px}px</span>
							<span className="h-4 rounded-4 bg-fill-brand-strong" style={{ width: px }} />
						</li>
					))}
				</ul>
			</Section>

			<Section
				title="Radius"
				description="Navngitt etter piksler, som i Figma. Jo større flate, jo rundere hjørne."
			>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
					{RADIUS.map(([className, usage]) => (
						<div key={className} className="flex flex-col gap-2">
							<div
								className={`h-16 border-2 border-stroke-brand-strong bg-fill-brand-weak ${className}`}
							/>
							<code className="font-mono text-tiny text-text-weak">{className}</code>
							<span className="text-tiny text-text-weak">{usage}</span>
						</div>
					))}
				</div>
			</Section>

			<Section
				title="Elevasjon"
				description="Myke, lagdelte skygger på 4-8 % svart. Practical UI løfter med lys, ikke med sot. I mørkt tema er de kraftigere - 4 % svart er usynlig der."
			>
				<div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
					{SHADOWS.map(([className, usage]) => (
						<div key={className} className="flex flex-col gap-3">
							<div className={`h-20 rounded-12 bg-background-raised ${className}`} />
							<code className="font-mono text-tiny text-text-weak">{className}</code>
							<span className="text-tiny text-text-weak">{usage}</span>
						</div>
					))}
				</div>
			</Section>
		</Page>
	);
}

export const Light: Story = {
	name: "Spacing",
	render: () => <Content />,
};

/**
 * Mørkt tema som egen story, ikke bare bak temabryteren: da kjører axe
 * kontrastsjekken mot de mørke verdiene også, og et brudd som bare finnes i
 * mørkt tema feiler bygget.
 *
 * `!dev` holder den ute av sidemenyen - dette er en test, ikke en side å bla
 * i. Vil du se paletten i mørkt tema, bruk temabryteren i verktøylinja.
 *
 * Taggene må stå her som literal. Storybooks indekser leser dem statisk og
 * ser ikke inn i et spredt objekt.
 */
export const Dark: Story = {
	name: "Spacing (dark theme)",
	tags: ["!dev", "!autodocs"],
	globals: { theme: "dark" },
	render: () => <Content />,
};
