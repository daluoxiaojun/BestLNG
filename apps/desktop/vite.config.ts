import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
    build: {
        target: "es2022",
    },
    clearScreen: false,
    envPrefix: ["VITE_", "TAURI_"],
    plugins: [react()],
    server: {
        host: "127.0.0.1",
        port: 1420,
        strictPort: true,
    },
});
