import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import EvolutionChart from './EvolutionChart';

// ---------------------------------------------------------------------------
// Time-series chart (line/bar) for the admin dashboard (area AI). Covers the
// "No data" placeholder (no x labels, or every series value null) and that a
// populated chart — line or bar — exposes its title as an accessible label.
// ---------------------------------------------------------------------------
const xLabels = ['2026-01', '2026-02', '2026-03'];

describe('EvolutionChart (AI)', () => {
    it('TC-AI14: shows the "No data" placeholder with no x labels or all-null series', () => {
        const { rerender } = render(
            <EvolutionChart title="Cumulative growth" xLabels={[]} series={[{ label: 'Projects', data: [] }]} />,
        );
        expect(screen.getByText('No data')).toBeInTheDocument();
        expect(screen.queryByLabelText('Cumulative growth')).not.toBeInTheDocument();

        rerender(
            <EvolutionChart
                title="Cumulative growth"
                xLabels={xLabels}
                series={[{ label: 'Projects', data: [null, null, null] }]}
            />,
        );
        expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('TC-AI15: renders an accessible line chart (default variant) when there is data', () => {
        render(
            <EvolutionChart
                title="Cumulative growth"
                xLabels={xLabels}
                series={[{ label: 'Projects', data: [1, 3, 7] }]}
            />,
        );

        expect(screen.queryByText('No data')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Cumulative growth')).toBeInTheDocument();
    });

    it('TC-AI16: renders a bar chart when variant="bar"', () => {
        render(
            <EvolutionChart
                title="New projects"
                variant="bar"
                xLabels={xLabels}
                series={[{ label: 'Projects', data: [2, 0, 5] }]}
            />,
        );

        expect(screen.getByLabelText('New projects')).toBeInTheDocument();
    });
});
