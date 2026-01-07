import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [svelte()],

    // Vite options tailored for Tauri development
    clearScreen: false,
    server: {
        host: host || false,
        port: 1420,
        strictPort: true,
        hmr: host
            ? {
                protocol: "ws",
                host: host,
                port: 1430,
            }
            : undefined,
    },
    envPrefix: ["VITE_", "TAURI_"],
    build: {
        target: ["es2021", "chrome100", "safari13"],
        minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
        sourcemap: !!process.env.TAURI_DEBUG,
    },
});
