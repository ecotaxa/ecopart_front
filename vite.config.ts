// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [react()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "src"),
            },
        },

        server: {
            proxy: {
                "/auth": {
                    target: env.VITE_BACKEND_URL || "http://localhost:4000",
                    changeOrigin: true,
                },
                "/users": {
                    target: env.VITE_BACKEND_URL || "http://localhost:4000",
                    changeOrigin: true,
                },
            },
        },

        // --- TEST CONFIGURATION ---
        test: {
            globals: true,                // Allows using describe, it, expect without importing them
            environment: "jsdom",         // Simulates a browser environment (window, document)
            setupFiles: "./src/test/setup.ts", // Path to the test initialization file
            css: true,                    // Processes CSS files (useful if components depend on styles)
            coverage: {
                provider: "v8",
                reporter: ["text", "html", "json"],
                exclude: [
                    'node_modules/',
                    'src/test/setup.ts',
                ],
            },
        },
    }
});