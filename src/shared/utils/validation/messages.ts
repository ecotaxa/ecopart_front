/**
 * Centralized validation messages to ensure consistency across the app.
 */
export const VALIDATION_MESSAGES = {
    EMAIL_INVALID: "Please enter a valid email address.",
    PASSWORD_REQ: "8+ chars, uppercase, lowercase, number, special char (@!#$%^&*()_+.,;:).",
    PASSWORD_MISMATCH: "Passwords do not match.",
    REQUIRED_FIELD: "This field is required.",
    GENERIC_ERROR: "An unexpected error occurred. Please try again.",
    EXIST_EMAIL: "An account with this email already exists.",
    LOGIN_FAILED: "Invalid email or password",
    RESET_LINK_SENT: "If this email address exists, you will receive an email with instructions to reset your password."
};