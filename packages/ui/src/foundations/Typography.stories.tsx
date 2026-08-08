import type { Meta, StoryObj } from "@storybook/react-vite";
import { Page, Section } from "./layout.tsx";

/**
 * Typografien i designsystemet. Inter gjennomgående.
 *
 * Hver klasse i rampen setter størrelse, linjehøyde og sperring i ett. Det er
 * hele poenget: de tre hører sammen, og settes de hver for seg kommer de før
 * eller siden i utakt.
 */
const meta: Meta = {
	title: "Foundations/Typography",
	parameters: { layout: "fullscreen" },
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

const RAMP = [
	["text-display", "Display", "56 / 64"],
	["text-h1", "Overskrift 1", "40 / 48"],
	["text-h2", "Overskrift 2", "32 / 40"],
	["text-h3", "Overskrift 3", "24 / 32"],
	["text-h4", "Overskrift 4", "20 / 28"],
	["text-lead", "Ingress", "20 / 31"],
	["text-body", "Brødtekst", "16 / 24"],
	["text-small", "Liten", "14 / 20"],
	["text-tiny", "Bitteliten", "13 / 18"],
];

const WEIGHTS = [
	["font-regular", "400", "Brødtekst"],
	["font-medium", "500", "Etiketter og knappetekst i skjema"],
	["font-strong", "600", "Overskrifter og sterk UI-tekst"],
	["font-bold", "700", "Brukes sjelden"],
];

function Content() {
	return (
		<Page>
			<Section
				title="Typerampen"
				description="Tallene er størrelse / linjehøyde i piksler. Sperringen er negativ på de store trinnene, fra -0.01em på h4 til -0.03em på display."
			>
				<dl className="space-y-6">
					{RAMP.map(([className, name, metrics]) => (
						<div key={className} className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
							<dt className="w-40 shrink-0">
								<code className="font-mono text-tiny text-text-weak">{className}</code>
								<span className="ml-2 text-tiny text-text-weak">{metrics}</span>
							</dt>
							<dd className={`font-strong text-text-strong ${className}`}>{name}</dd>
						</div>
					))}
				</dl>
			</Section>

			<Section
				title="Vekter"
				description="Practical UIs sterke vekt er Semi Bold på 600, ikke 700. Det er den vanligste feilen når noe skrives for hånd."
			>
				<dl className="space-y-3">
					{WEIGHTS.map(([className, weight, usage]) => (
						<div key={className} className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
							<dt className="w-40 shrink-0">
								<code className="font-mono text-tiny text-text-weak">{className}</code>
								<span className="ml-2 text-tiny text-text-weak">{weight}</span>
							</dt>
							<dd className={`text-h4 text-text-strong ${className}`}>
								Oslo Børs <span className="font-regular text-small text-text-weak">{usage}</span>
							</dd>
						</div>
					))}
				</dl>
			</Section>

			<Section
				title="Skriftfamilier"
				description="Inter selvhostes i @bjelle/tokens, i samme pakke som --font-sans peker på. Practical UI henter den fra Google Fonts; det gjør ikke vi - et token skal ikke love en font en tredjepart leverer."
			>
				<ul className="space-y-3">
					<li className="font-sans text-body text-text-strong">
						font-sans - Inter Variable.{" "}
						<span className="text-text-weak">Alt av grensesnitt og brødtekst.</span>
					</li>
					<li className="font-mono text-body text-text-strong">
						font-mono - Menlo. <span className="text-text-weak">Kode, ISIN-koder og tickere.</span>
					</li>
				</ul>
			</Section>
		</Page>
	);
}

export const Light: Story = {
	name: "Typography",
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
	name: "Typography (dark theme)",
	tags: ["!dev", "!autodocs"],
	globals: { theme: "dark" },
	render: () => <Content />,
};
