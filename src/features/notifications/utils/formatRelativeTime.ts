const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 24 * 3600],
    ["month", 30 * 24 * 3600],
    ["week", 7 * 24 * 3600],
    ["day", 24 * 3600],
    ["hour", 3600],
    ["minute", 60],
];

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "just now", "5 minutes ago", "yesterday", … for an ISO date in the past. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
    const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
    if (Number.isNaN(seconds)) return "";
    for (const [unit, size] of UNITS) {
        if (Math.abs(seconds) >= size) return formatter.format(-Math.floor(seconds / size), unit);
    }
    return "just now";
}
