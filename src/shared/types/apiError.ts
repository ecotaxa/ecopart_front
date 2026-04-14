/**
 * Standard API error response type
 * Handles both validation errors (array format) and general error messages
 */
export type ApiErrorResponse = {
    errors?: Array<string | { msg?: string }>;
    message?: string;
} | null;
