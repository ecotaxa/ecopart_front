import { describe, it, expect } from 'vitest';

import { createScale, extent, formatTick, niceTicks } from './chartScales';

describe('chartScales', () => {
    it('picks round ticks', () => {
        expect(niceTicks(0, 100)).toEqual([0, 20, 40, 60, 80, 100]);
        expect(niceTicks(0, 0.07)).toEqual([0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07]);
        expect(niceTicks(3, 3)).toEqual([3]);
    });

    it('maps linearly, and reversed when the range is', () => {
        const scale = createScale('linear', [0, 100], [0, 200]);
        expect(scale.map(50)).toBe(100);
        expect(createScale('linear', [0, 100], [200, 0]).map(25)).toBe(150);
    });

    it('cannot draw zero or negatives in log10, and ticks on powers of ten', () => {
        const scale = createScale('log10', [1, 1000], [0, 300]);
        expect(scale.map(10)).toBeCloseTo(100);
        expect(scale.map(0)).toBeNaN();
        expect(scale.ticks).toEqual([1, 10, 100, 1000]);
    });

    it('keeps zero on log(x+1) and sqrt', () => {
        expect(createScale('log1p', [0, 99], [0, 200]).map(9)).toBeCloseTo(100);
        expect(createScale('sqrt', [0, 100], [0, 100]).map(25)).toBe(50);
    });

    it('skips what a scale cannot draw in the extent', () => {
        expect(extent([0, -1, 5, 20], 'log10')).toEqual([5, 20]);
        expect(extent([0, -1, 5], 'linear')).toEqual([-1, 5]);
        expect(extent([NaN])).toBeNull();
    });

    it('formats ticks compactly', () => {
        expect(formatTick(1200)).toBe('1200');
        expect(formatTick(0.000012)).toBe('1.2e-5');
        expect(formatTick(0.30000000000000004)).toBe('0.3');
    });

    it('keeps the mantissa of exponent labels, so close ticks stay distinct', () => {
        expect(formatTick(0.00025)).toBe('2.5e-4');
        expect(formatTick(0.0005)).toBe('5e-4');
        expect(formatTick(100000)).toBe('1e5');
        const labels = [100000, 120000, 140000].map(formatTick);
        expect(labels).toEqual(['1e5', '1.2e5', '1.4e5']);
    });

    it('falls back to a few decades in log10 when the domain has no positive bound', () => {
        expect(createScale('log10', [0, 1], [0, 300]).ticks).toEqual([0.01, 0.1, 1]);
        expect(createScale('log10', [-5, 0], [0, 300]).ticks).toEqual([0.1, 1, 10]);
    });
});
