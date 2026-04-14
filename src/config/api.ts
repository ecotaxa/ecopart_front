// config/api.ts

// En production, on utilise OBLIGATOIREMENT la variable d'environnement
// car le proxy Vite n'existe plus.
export const API_BASE_URL = import.meta.env.DEV 
    ? ""  // En dev, on laisse vide pour utiliser le proxy localhost:5173 -> localhost:4000
    : import.meta.env.VITE_BACKEND_URL; // En prod, c'est l'URL injectée par Docker