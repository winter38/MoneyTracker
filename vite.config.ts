import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
    /**
     * Relative base makes the production build work no matter which subfolder
     * it is hosted from (GitHub Pages project pages, a local `dist` preview, etc.).
     */
    base: "./",
    plugins: [vue()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    server: {
        port: 5173,
    },
});
