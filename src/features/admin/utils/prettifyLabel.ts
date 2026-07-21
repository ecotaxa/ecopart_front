/**
 * Turns a raw backend enum label into a readable one for display.
 * e.g. "EXPORT_RAW" -> "Export raw", "IMPORT_ECO_TAXA" -> "Import eco taxa".
 *
 * Instrument model names (e.g. "UVP6LP") are left untouched: they are acronyms,
 * not snake_case enums, so we only prettify labels that contain a separator or
 * are fully uppercased words.
 */
export function prettifyLabel(label: string): string {
    if (!label) return label;

    // Keep acronym-style instrument names as-is (no underscore, mixed case/digits).
    if (!label.includes("_") && label !== label.toUpperCase()) {
        return label;
    }
    // Pure acronym with no separator (e.g. "UVP6LP", "IFCB"): leave untouched.
    if (!label.includes("_") && /[0-9]/.test(label)) {
        return label;
    }

    const words = label.toLowerCase().split("_").filter(Boolean);
    if (words.length === 0) return label;
    return words
        .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
        .join(" ");
}
