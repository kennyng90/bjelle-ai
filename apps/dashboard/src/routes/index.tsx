import { Button } from "@bjelle/ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<div className="p-8">
			<h1 className="font-bold text-4xl text-ink-900">Bjelle dashboard</h1>
			<p className="mt-4 text-ink-600 text-lg">
				Rediger <code className="font-mono">src/routes/index.tsx</code> for å komme i gang.
			</p>
			<div className="mt-6 flex gap-3">
				<Button>Følg selskapet</Button>
				<Button variant="secondary">Se alle meldinger</Button>
				<Button variant="ghost">Avbryt</Button>
			</div>
		</div>
	);
}
