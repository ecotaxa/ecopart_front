/**
 * "2022-12-05T15:14:44.000Z" -> "UTC  2022-12-05 15:14:44" ("2022-12-05 15:14:44" with
 * `withPrefix: false`); empty when missing, raw value when unparsable.
 */
export const formatUtcDateTime = (value?: string | null, { withPrefix = true } = {}): string => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const formatted = date.toISOString().slice(0, 19).replace("T", " ");
    return withPrefix ? `UTC  ${formatted}` : formatted;
};
