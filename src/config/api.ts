// En DEV, on utilise une chaîne vide pour profiter du Proxy Vite (ex: /auth/login).
// En PROD, on utilise l'URL complète définie dans les variables d'environnement.
export const API_BASE_URL = import.meta.env.DEV ? "" : (import.meta.env.VITE_BACKEND_URL || "");