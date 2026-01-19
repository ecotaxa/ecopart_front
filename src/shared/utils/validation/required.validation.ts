// src/shared/utils/validation/required.validation.ts

export function isNonEmpty(value: string): boolean {
    return value.trim().length > 0;
}
