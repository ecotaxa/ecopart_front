import type { ValueScale } from "../types/explore.types";

/** Value → plotted coordinate, before the linear mapping to pixels. NaN when it cannot be drawn. */
const FORWARD: Record<ValueScale, (value: number) => number> = {
    linear: (value) => value,
    sqrt: (value) => Math.sign(value) * Math.sqrt(Math.abs(value)),
    log1p: (value) => Math.sign(value) * Math.log10(1 + Math.abs(value)),
    log10: (value) => (value > 0 ? Math.log10(value) : NaN),
};

/** A step of 1, 2 or 5 × 10^n close to `span / count`. */
function niceStep(span: number, count: number): number {
    const raw = span / Math.max(count, 1);
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const normalized = raw / magnitude;
    return (normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1) * magnitude;
}

/** Round-number ticks covering [min, max]. */
export function niceTicks(min: number, max: number, count = 5): number[] {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
    if (min === max) return [min];
    const step = niceStep(max - min, count);
    const ticks: number[] = [];
    for (let tick = Math.ceil(min / step) * step; tick <= max + step * 1e-9; tick += step) {
        // Strip the float noise of repeated additions (0.30000000000000004).
        ticks.push(Number(tick.toPrecision(12)));
    }
    return ticks;
}

/** Powers of ten in [min, max] (both > 0), with 2× and 5× when the range is short. */
function logTicks(min: number, max: number): number[] {
    const ticks: number[] = [];
    const decades = Math.log10(max) - Math.log10(min);
    const multiples = decades < 2 ? [1, 2, 5] : [1];
    for (let exponent = Math.floor(Math.log10(min)); exponent <= Math.ceil(Math.log10(max)); exponent += 1) {
        for (const multiple of multiples) {
            const tick = Number((multiple * 10 ** exponent).toPrecision(12));
            if (tick >= min && tick <= max) ticks.push(tick);
        }
    }
    return ticks;
}

export interface Scale {
    /** Pixel of a value, NaN when the value cannot be drawn on this scale (e.g. ≤ 0 in log10). */
    map: (value: number) => number;
    ticks: number[];
}

/**
 * A scale from the data `domain` to the pixel `range` (pass the range reversed to
 * flip the axis). Ticks are raw values, spread the way the scale spreads them.
 */
export function createScale(kind: ValueScale, domain: [number, number], range: [number, number]): Scale {
    const forward = FORWARD[kind];
    let [min, max] = domain;
    if (kind === "log10") {
        min = Math.max(min, Number.MIN_VALUE);
        if (max <= min) max = min * 10;
    }
    const [from, to] = [forward(min), forward(max)];
    const span = to - from || 1;
    const map = (value: number) => {
        const projected = forward(value);
        return Number.isFinite(projected) ? range[0] + ((projected - from) / span) * (range[1] - range[0]) : NaN;
    };

    let ticks: number[];
    if (kind === "log10") {
        ticks = logTicks(min, max);
    } else if (kind === "log1p" && max > 10) {
        ticks = [0, ...logTicks(1, max)].filter((tick) => tick >= min);
    } else {
        ticks = niceTicks(min, max);
    }
    return { map, ticks };
}

/** Extent of the drawable values of `values` on `kind`, or null when there is none. */
export function extent(values: number[], kind: ValueScale = "linear"): [number, number] | null {
    let min = Infinity;
    let max = -Infinity;
    for (const value of values) {
        if (!Number.isFinite(value) || (kind === "log10" && value <= 0)) continue;
        if (value < min) min = value;
        if (value > max) max = value;
    }
    return min <= max ? [min, max] : null;
}

/** Compact tick label: 1200 → "1200", 0.000012 → "1.2e-5". */
export function formatTick(value: number): string {
    if (value === 0) return "0";
    const abs = Math.abs(value);
    if (abs >= 1e5 || abs < 1e-3) return value.toExponential(0).replace("+", "");
    return String(Number(value.toPrecision(4)));
}
