import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import KpiCard from './KpiCard';

// ---------------------------------------------------------------------------
// Presentational KPI tile for the admin statistics dashboard (area AI).
// ---------------------------------------------------------------------------
describe('KpiCard (AI)', () => {
    it('TC-AI9: renders the label, value and optional icon, and shows the sub line only when provided', () => {
        const { rerender } = render(
            <KpiCard
                label="Total users"
                value={600}
                sub="12 admins"
                icon={<span data-testid="kpi-icon" />}
            />,
        );

        expect(screen.getByText('Total users')).toBeInTheDocument();
        expect(screen.getByText('600')).toBeInTheDocument();
        expect(screen.getByText('12 admins')).toBeInTheDocument();
        expect(screen.getByTestId('kpi-icon')).toBeInTheDocument();

        // Without a `sub`, no caption line is rendered.
        rerender(<KpiCard label="Total users" value={600} />);
        expect(screen.queryByText('12 admins')).not.toBeInTheDocument();
    });

    it('TC-AI10: accepts a pre-formatted string value (e.g. from formatBytes)', () => {
        render(<KpiCard label="Total storage" value="117.7 MB" color="warning" />);

        expect(screen.getByText('Total storage')).toBeInTheDocument();
        expect(screen.getByText('117.7 MB')).toBeInTheDocument();
    });
});
