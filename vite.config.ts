// vite.config.ts
import { defineConfig } from 'vitest/config';
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },

    server: {
        proxy: {
            "/auth": {
                target: "http://localhost:4000",
                changeOrigin: true,
            },
            "/users": {
                target: "http://localhost:4000",
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
});