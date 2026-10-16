import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';

// MapLibre needs WebGL, which jsdom lacks: the map is replaced by a stand-in.
vi.mock('../components/ExploreMap', () => ({
    default: () => <div data-testid="explore-map" />,
}));
vi.mock('@/shared/api/referenceData.hooks', () => ({
    useInstrumentModels: () => ({ data: [] }),
}));

import { renderWithRouter } from '@/test/utils';
import ExplorePage from './ExplorePage';

const renderPage = (route = '/explore') => renderWithRouter(
    <Routes>
        <Route path="/explore/:mode?/:tabName?" element={<ExplorePage />} />
    </Routes>,
    { route },
);

describe('ExplorePage', () => {
    it('opens on the depth profiles stats with empty criteria and counters', async () => {
        renderPage();

        expect(screen.getByRole('heading', { name: 'Explore data' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Depth profiles' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('tab', { name: /Selected data stats/ })).toHaveAttribute('aria-selected', 'true');
        expect(await screen.findByTestId('explore-map')).toBeInTheDocument();

        expect(screen.getByLabelText('North')).toHaveValue('');
        for (const label of ['Projects', 'Samples', 'Particles', 'Images']) {
            const card = screen.getByText(label, { selector: 'div' }).parentElement!;
            expect(within(card).getByText('—')).toBeInTheDocument();
        }
        expect(screen.getByText(/Set your data selection criteria/)).toBeInTheDocument();
    });

    it('applies the criteria only with "Apply filters", once they are valid', async () => {
        const user = userEvent.setup();
        renderPage();

        const apply = screen.getByRole('button', { name: 'Apply filters' });
        await user.type(screen.getByLabelText('North'), '95');
        expect(apply).toBeDisabled();
        expect(screen.getByText('Fill the four coordinates, or none.')).toBeInTheDocument();

        await user.click(screen.getAllByRole('button', { name: 'Clear' })[2]);
        expect(apply).toBeEnabled();
        await user.click(apply);

        expect(screen.queryByText(/Set your data selection criteria/)).not.toBeInTheDocument();
        // Nothing changed since: applying again is pointless.
        expect(apply).toBeDisabled();
    });

    it('opens the time series page and its time bin from the route', () => {
        renderPage('/explore/time/exportable');

        expect(screen.getByRole('button', { name: 'Time series' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('heading', { name: 'Exportable selection' })).toBeInTheDocument();
        expect(screen.getByText('Time bin')).toBeInTheDocument();
        expect(screen.queryByText('Pressure bin')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Export selection/ })).toBeDisabled();
    });
});
