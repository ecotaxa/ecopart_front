import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { QcProfileChart, QcChartSeries } from './QcProfileChart';

// Depth (y) is irrelevant to the branch logic under test; only the x values (the plotted value)
// decide log/linear and which points survive, so we spread depth linearly.
const seriesFrom = (label: string, color: string, xs: number[]): QcChartSeries => ({
    label,
    color,
    points: xs.map((x, i) => ({ x, y: i * 5 })),
});

describe('components/QcProfileChart', () => {
    it('TC-AB1: always renders the title caption', () => {
        render(<QcProfileChart title="Vertical profile of the pressure" series={[]} xLabel="value" />);
        expect(screen.getByText('Vertical profile of the pressure')).toBeInTheDocument();
    });

    it('TC-AB2: shows the "No data" fallback when no series has plottable points', () => {
        const { container } = render(
            <QcProfileChart title="Empty" series={[seriesFrom('a', '#000', [])]} xLabel="value" />
        );
        expect(screen.getByText('No data')).toBeInTheDocument();
        // The ScatterChart is not mounted at all in the fallback branch.
        expect(container.querySelector('svg')).toBeNull();
    });

    it('TC-AB3: renders the chart (svg) when at least one series has points', () => {
        const { container } = render(
            <QcProfileChart title="Linear" series={[seriesFrom('a', '#000', [1, 2, 3])]} xLabel="value" />
        );
        expect(screen.queryByText('No data')).not.toBeInTheDocument();
        expect(container.querySelector('svg')).not.toBeNull();
    });

    it('TC-AB4: under a log scale, drops an all-zero series but keeps the positive one without crashing', () => {
        // Regression: MUI X builds a per-series spatial index and throws "Unexpected numItems value: 0"
        // on a series with zero points — exactly what an all-zero pixel class becomes once the
        // non-positive points are clamped away under a log scale. If the empty-series filter regressed,
        // this render would throw and fail the test.
        const series: QcChartSeries[] = [
            seriesFrom('1 px', '#d32f2f', [2, 4, 8]),
            seriesFrom('3 px', '#1976d2', [0, 0, 0]),
        ];
        const { container } = render(
            <QcProfileChart title="Log" series={series} xLabel="count" xScale="log" showLegend />
        );
        expect(screen.queryByText('No data')).not.toBeInTheDocument();
        expect(container.querySelector('svg')).not.toBeNull();
    });

    it('TC-AB5: keeps a linear scale (plots the zeros) when log is requested but nothing is positive', () => {
        // anyPositive === false → the component must NOT switch to log, otherwise every point would be
        // clamped out and the graph would collapse to "No data".
        const { container } = render(
            <QcProfileChart title="AllZero" series={[seriesFrom('zeros', '#000', [0, 0])]} xLabel="count" xScale="log" />
        );
        expect(screen.queryByText('No data')).not.toBeInTheDocument();
        expect(container.querySelector('svg')).not.toBeNull();
    });

    it('TC-AB6: renders the x-axis title and non-empty tick labels', () => {
        // Regression: both axes carry a title, so if MUI auto-sizes the x-axis too
        // small it leaves no room for the tick labels and blanks them (empty <tspan>
        // under every tick). The component pins an explicit axis height/width to keep
        // the tick labels visible. NOTE: jsdom measures text width as 0, so it can't
        // reproduce the squeeze itself — this asserts the labels render with content
        // in the normal path and that the x-axis title is present.
        const { container } = render(
            <QcProfileChart
                title="Linear"
                series={[seriesFrom('a', '#000', [1000, 5000, 9000, 12000])]}
                xLabel="count"
            />
        );
        // The x-axis title renders.
        expect(screen.getByText('count')).toBeInTheDocument();
        // At least one x-axis tick label has non-empty text (labels are not blanked).
        const xTickLabels = Array.from(
            container.querySelectorAll('.MuiChartsAxis-directionX .MuiChartsAxis-tickLabel')
        );
        expect(xTickLabels.length).toBeGreaterThan(0);
        expect(xTickLabels.some((el) => (el.textContent ?? '').trim() !== '')).toBe(true);
    });

    describe('Accessibility Tests', () => {
        it('TC-AB12: exposes a readable text label and announces the empty state as text', () => {
            // A ScatterChart is an opaque <svg> for a screen reader: the title caption is the only
            // human-readable description of the graph, and "No data" is the accessible empty state
            // (instead of a silent, unlabelled empty chart).
            const { rerender } = render(
                <QcProfileChart title="Vertical profile of imaged volume" series={[]} xLabel="value" />
            );
            expect(screen.getByText('No data')).toBeInTheDocument();
            expect(screen.getByText('Vertical profile of imaged volume')).toBeInTheDocument();

            rerender(
                <QcProfileChart
                    title="Vertical profile of imaged volume"
                    series={[{ label: 'v', color: '#000', points: [{ x: 1, y: 0 }, { x: 2, y: 5 }] }]}
                    xLabel="value"
                />
            );
            // The description persists once the chart is populated.
            expect(screen.getByText('Vertical profile of imaged volume')).toBeInTheDocument();
        });
    });
});
