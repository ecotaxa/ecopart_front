import { describe, it, expect } from 'vitest';

import { decimate } from './decimate';

const curve = (length: number, value: (index: number) => number): [number, number][] =>
    Array.from({ length }, (_unused, index) => [value(index), index]);

describe('decimate', () => {
    it('keeps a short curve as it is', () => {
        const points = curve(10, (index) => index * 2);
        expect(decimate(points, 0, 20)).toBe(points);
    });

    it('keeps the lowest and highest value of each slice, in their order', () => {
        // Slices of 4 points: [5, 1, 9, 3] then [2, 8, 0, 4].
        const values = [5, 1, 9, 3, 2, 8, 0, 4];
        const points = curve(values.length, (index) => values[index]);

        expect(decimate(points, 0, 4)).toEqual([[1, 1], [9, 2], [8, 5], [0, 6]]);
    });

    it('reads the value on the axis it is told', () => {
        const points: [number, number][] = [[0, 5], [1, 1], [2, 9], [3, 3]];
        expect(decimate(points, 1, 2)).toEqual([[1, 1], [2, 9]]);
    });

    it('never returns more points than asked, and keeps the extremes of a long curve', () => {
        const points = curve(100_000, (index) => Math.sin(index / 50) * 10 + (index === 77_777 ? 1000 : 0));
        const kept = decimate(points, 0, 2000);

        expect(kept.length).toBeLessThanOrEqual(2000);
        expect(Math.max(...kept.map(([value]) => value))).toBe(Math.max(...points.map(([value]) => value)));
        expect(kept.map(([, position]) => position)).toEqual([...kept.map(([, position]) => position)].sort((a, b) => a - b));
    });

    it('keeps one point of a slice without any value', () => {
        const points = curve(8, (index) => (index < 4 ? NaN : index));
        const kept = decimate(points, 0, 4);

        expect(kept[0][1]).toBe(0);
        expect(Number.isNaN(kept[0][0])).toBe(true);
        expect(kept.slice(1)).toEqual([[4, 4], [7, 7]]);
    });
});
