import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// @storybook/react-vite legger selv på @vitejs/plugin-react. Her trengs kun
// Tailwind, så designtokens og utilities er tilgjengelige i preview-iframen.
export default defineConfig({
	plugins: [tailwindcss()],
});
