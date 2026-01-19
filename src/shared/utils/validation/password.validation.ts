// src/shared/utils/validation/password.validation.ts

export function isValidPassword(password: string): boolean {
    return (
        password.length >= 8 &&
        /[0-9]/.test(password) &&
        /[a-z]/.test(password) &&
        /[A-Z]/.test(password) &&
        /[@!#$%^&*()_+.,;:]/.test(password)
    );
}

export function passwordsMatch(a: string, b: string): boolean {
    return a === b;
}
