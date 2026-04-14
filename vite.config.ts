// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    // Make sure there is no trailing slash at the end of the backend URL
    const backendUrl = (env.VITE_BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');
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
                    target: backendUrl,
                    changeOrigin: true,
                },
                "/users": {
                    target: backendUrl,
                    changeOrigin: true,
                },
                /// Smartly intercept "/projects"
                "/projects": {
                    target: backendUrl,
                    changeOrigin: true,
                    // The bypass function decides whether the request should go to the backend or the React frontend
                    bypass: (req) => {
                        // If the request comes from the browser (address bar, refresh) -> "text/html"
                        if (req.headers.accept?.includes('text/html')) {
                            // Cancel the proxy and let React Router display <ProjectsPage />
                            return '/index.html';
                        }
                        // If it is a fetch() or axios from your code -> "application/json"
                        // Return null, so the proxy activates and sends it to the Backend (localhost:4000)
                        return null;
                    }
                }
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