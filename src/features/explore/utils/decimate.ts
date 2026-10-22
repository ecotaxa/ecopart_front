/** Curves holding more points than this are thinned out before being drawn. */
export const MAX_DRAWN_POINTS = 2000;

/**
 * At most `maxPoints` points of a curve, for drawing: the curve is cut in slices
 * of consecutive points, of which only the lowest and the highest value
 * (`point[valueIndex]`) are kept, in their order. Peaks and troughs stay; a
 * slice without any value keeps its first point, so a gap stays a gap.
 */
export function decimate(
    points: [number, number][],
    valueIndex: 0 | 1,
    maxPoints = MAX_DRAWN_POINTS,
): [number, number][] {
    if (points.length <= maxPoints) return points;
    const sliceSize = Math.ceil(points.length / Math.max(1, Math.floor(maxPoints / 2)));
    const kept: [number, number][] = [];

    for (let start = 0; start < points.length; start += sliceSize) {
        const end = Math.min(start + sliceSize, points.length);
        let low = -1;
        let high = -1;
        for (let index = start; index < end; index += 1) {
            const value = points[index][valueIndex];
            if (Number.isNaN(value)) continue;
            if (low < 0 || value < points[low][valueIndex]) low = index;
            if (high < 0 || value > points[high][valueIndex]) high = index;
        }
        if (low < 0) kept.push(points[start]);
        else if (low === high) kept.push(points[low]);
        else if (low < high) kept.push(points[low], points[high]);
        else kept.push(points[high], points[low]);
    }
    return kept;
}
