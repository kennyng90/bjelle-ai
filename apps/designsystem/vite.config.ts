import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Én config for både Storybook og test. Testene MÅ arve tailwindcss-pluginen:
// uten den rendres komponentene ustilt, og da består enhver kontrastsjekk
// trivielt. Splittes dette i en egen vitest.config.ts vinner den over denne
// fila, Tailwind faller ut, og testene blir grønne uten å dekke noe.
export default defineConfig({
	// @storybook/react-vite legger selv på @vitejs/plugin-react. Her trengs kun
	// Tailwind, så designtokens og utilities er tilgjengelige i preview-iframen.
	plugins: [tailwindcss()],
	test: {
		projects: [
			{
				extends: true,
				plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
				test: {
					name: "storybook",
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
	},
});
