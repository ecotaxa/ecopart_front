/* Formatting helpers of the project STATS tab. */

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** 1234 → "1.2K", 1000000 → "1M". */
export const formatCompact = (value: number): string => compact.format(value);

/** The UTC day of an ISO date-time ("2021-05-05T10:00:00Z" → "2021-05-05"); "—" when missing or unreadable. */
export const formatUtcDay = (value: string | null | undefined): string => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toISOString().slice(0, 10);
};

/** "may 2019" style month of an ISO date-time, in UTC. */
export const formatUtcMonth = (value: string): string =>
    new Date(value).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/** A size in µm, switched to mm from 1 mm ("42µm", "81mm"). */
export const formatSize = (um: number): string => (um >= 1000 ? `${Math.round(um / 100) / 10}mm` : `${Math.round(um)}µm`);

/** A pressure in dbar shown as a depth in metres ("3056m"). */
export const formatDepth = (dbar: number): string => `${Math.round(dbar)}m`;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"}`;

/**
 * How long ago an ISO date-time was, in the largest round unit ("3 weeks", "2 months",
 * "just now" under a minute); "—" when missing or unreadable.
 */
export const formatElapsed = (value: string | null | undefined, now: Date = new Date()): string => {
    if (!value) return "—";
    const elapsed = now.getTime() - new Date(value).getTime();
    if (Number.isNaN(elapsed)) return "—";
    if (elapsed < MINUTE) return "just now";
    if (elapsed < HOUR) return plural(Math.floor(elapsed / MINUTE), "minute");
    if (elapsed < DAY) return plural(Math.floor(elapsed / HOUR), "hour");
    if (elapsed < WEEK) return plural(Math.floor(elapsed / DAY), "day");
    if (elapsed < MONTH) return plural(Math.floor(elapsed / WEEK), "week");
    if (elapsed < YEAR) return plural(Math.floor(elapsed / MONTH), "month");
    return plural(Math.floor(elapsed / YEAR), "year");
};

/** "1 sample" / "3 samples". */
export const pluralize = plural;
