// Récupération de l'URL selon l'environnement (Dev vs Prod)
const rawApiBaseUrl = import.meta.env.DEV
    ? "" // En dev, on laisse vide pour utiliser le proxy vite (localhost)
    : import.meta.env.VITE_BACKEND_URL; // En prod, URL injectée par le build

// FAIL FAST: En production, si l'URL est manquante, on bloque tout de suite pour avertir le devops.
if (import.meta.env.PROD && (!rawApiBaseUrl || typeof rawApiBaseUrl !== "string")) {
    throw new Error(
        "[config/api] CRITICAL ERROR: VITE_BACKEND_URL is not defined in production environment."
    );
}

// Helper pour éviter les URL mal formées comme "http://api.com//users"
const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/, "");

// Export final sécurisé
export const API_BASE_URL = normalizeBaseUrl(rawApiBaseUrl ?? "");