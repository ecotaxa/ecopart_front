import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import BreakdownChart from './BreakdownChart';

// ---------------------------------------------------------------------------
// Categorical breakdown chart (bar/pie) for the admin dashboard (area AI).
// The logic worth pinning is the "No data" placeholder (shown when every slice
// is zero or the list is empty) and that a populated chart exposes its title as
// an accessible label. Charts render in jsdom via the ResizeObserver /
// getBoundingClientRect stubs in test/setup.ts.
// ---------------------------------------------------------------------------
describe('BreakdownChart (AI)', () => {
    it('TC-AI11: shows the "No data" placeholder for an empty list or all-zero counts', () => {
        const { rerender } = render(<BreakdownChart title="By instrument" data={[]} />);
        expect(screen.getByText('No data')).toBeInTheDocument();
        expect(screen.queryByLabelText('By instrument')).not.toBeInTheDocument();

        rerender(
            <BreakdownChart
                title="By instrument"
                data={[{ label: 'UVP6', count: 0 }, { label: 'ZOOSCAN', count: 0 }]}
            />,
        );
        expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('TC-AI12: renders an accessible bar chart (default variant) when there is data', () => {
        render(
            <BreakdownChart
                title="By instrument"
                data={[{ label: 'UVP6', count: 5 }, { label: 'ZOOSCAN', count: 2 }]}
            />,
        );

        expect(screen.queryByText('No data')).not.toBeInTheDocument();
        // The chart is aria-labelled with its title (used as the caption too).
        expect(screen.getByLabelText('By instrument')).toBeInTheDocument();
    });

    it('TC-AI13: renders a pie chart when variant="pie"', () => {
        render(
            <BreakdownChart
                title="Tasks by status"
                variant="pie"
                data={[{ label: 'DONE', count: 8 }, { label: 'PENDING', count: 3 }]}
            />,
        );

        expect(screen.getByLabelText('Tasks by status')).toBeInTheDocument();
    });
});
