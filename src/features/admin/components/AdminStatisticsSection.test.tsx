import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AdminStatisticsSection from './AdminStatisticsSection';
import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';

// Capture every /admin/stats request so we can assert the "compute on click"
// contract: no include_storage on load, include_storage=true only after click.
const statsRequests: string[] = [];

beforeAll(() => {
    server.events.on('request:start', ({ request }) => {
        if (request.url.includes('/admin/stats')) statsRequests.push(request.url);
    });
});

afterAll(() => {
    server.events.removeAllListeners();
});

describe('AdminStatisticsSection', () => {
    beforeEach(() => {
        statsRequests.length = 0;
    });

    it('TC-AI17: loads basic stats + a chart without requesting storage, and shows the compute placeholder', async () => {
        renderWithRouter(<AdminStatisticsSection />);

        // Basic KPIs render (the "Pending email validations" tile only appears once data resolves).
        expect(await screen.findByText('Pending email validations')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Application statistics/i })).toBeInTheDocument();

        // An evolution chart is present (aria-labelled).
        expect(screen.getByLabelText('Cumulative growth')).toBeInTheDocument();

        // Storage is NOT computed: placeholder + button, no Storage KPI yet.
        expect(screen.getByText(/Storage not computed yet/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Compute storage & data size/i })).toBeInTheDocument();
        expect(screen.queryByText('Total storage')).not.toBeInTheDocument();

        // The only request(s) so far must not ask for storage.
        expect(statsRequests.length).toBeGreaterThanOrEqual(1);
        expect(statsRequests.every((u) => !u.includes('include_storage=true'))).toBe(true);
    });

    it('TC-AI18: computes storage on click: fires include_storage=true and reveals the storage KPI + chart', async () => {
        const user = userEvent.setup();
        renderWithRouter(<AdminStatisticsSection />);

        await screen.findByText('Pending email validations');
        statsRequests.length = 0; // ignore the initial load request

        await user.click(screen.getByRole('button', { name: /Compute storage & data size/i }));

        // Storage KPI + formatted value appear once the advanced fetch resolves.
        expect(await screen.findByText('Total storage')).toBeInTheDocument();
        expect(screen.getByText('117.7 MB')).toBeInTheDocument();
        expect(screen.getByLabelText('Cumulative data size')).toBeInTheDocument();

        // The triggered request carried include_storage=true.
        expect(statsRequests.some((u) => u.includes('include_storage=true'))).toBe(true);
    });

    it('TC-AI19: resets the storage block to the placeholder when the period changes (no auto recompute)', async () => {
        const user = userEvent.setup();
        renderWithRouter(<AdminStatisticsSection />);

        await screen.findByText('Pending email validations');
        await user.click(screen.getByRole('button', { name: /Compute storage & data size/i }));
        await screen.findByText('Total storage');

        statsRequests.length = 0;

        // Change the period → storage block must revert to the placeholder.
        const fromInput = screen.getByLabelText(/From/i);
        fireEvent.change(fromInput, { target: { value: '2026-02-01' } });

        await waitFor(() => {
            expect(screen.getByText(/Storage not computed yet/i)).toBeInTheDocument();
        });
        expect(screen.queryByText('Total storage')).not.toBeInTheDocument();

        // The refetch for the new window must NOT request storage automatically.
        expect(statsRequests.length).toBeGreaterThanOrEqual(1);
        expect(statsRequests.every((u) => !u.includes('include_storage=true'))).toBe(true);
    });
});
