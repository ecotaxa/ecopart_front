/**
 * Formats a byte count into a human-readable string using binary units.
 * e.g. 123456789 -> "117.7 MB".
 *
 * Returns "—" for `null`/`undefined` so callers can pass raw (possibly not-yet
 * computed) storage values straight through.
 */
export function formatBytes(bytes: number | null | undefined, decimals = 1): string {
    if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return "—";
    if (bytes <= 0) return "0 B";

    const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB"];
    const k = 1024;
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
    const value = bytes / Math.pow(k, i);
    // Bytes are always whole; larger units keep `decimals` places.
    const formatted = i === 0 ? String(Math.round(value)) : value.toFixed(decimals);
    return `${formatted} ${units[i]}`;
}
