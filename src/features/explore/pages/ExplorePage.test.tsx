import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';

// The map is replaced by a stand-in, memoized like the real one, which reports its renders.
const mapRendered = vi.hoisted(() => vi.fn());
vi.mock('../components/ExploreMap', async () => {
    const { memo } = await import('react');
    return {
        default: memo(function ExploreMapStandIn() {
            mapRendered();
            return <div data-testid="explore-map" />;
        }),
    };
});
vi.mock('@/shared/api/referenceData.hooks', () => ({
    useInstrumentModels: () => ({ data: [] }),
}));

import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';
import { ecotaxaHandler } from '@/test/msw/explore.handlers';
import { loginAsUser, logoutUser } from '@/test/helpers/auth.helpers';
import { ECOTAXA_POLL_MS } from '../hooks/useExploreData';
import ExplorePage from './ExplorePage';

const renderPage = (route = '/explore') => renderWithRouter(
    <Routes>
        <Route path="/explore/:tabName?" element={<ExplorePage />} />
    </Routes>,
    { route },
);

const UNAVAILABLE = /explore data service is not available yet/;

/** Paths of the requests sent to the backend. */
let requests: string[] = [];
const callsTo = (path: string) => requests.filter((requested) => requested === path);

const counter = (label: string) => screen.getByText(label, { selector: 'div' }).parentElement!;
const progress = () => screen.queryByRole('progressbar', { name: 'Loading the explore data' });
const PARTIAL_NOTE = /EcoTaxa statistics are being read for/;

describe('ExplorePage', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    beforeEach(() => {
        logoutUser();
        requests = [];
        server.events.removeAllListeners('request:start');
        server.events.on('request:start', ({ request }) => {
            requests.push(new URL(request.url).pathname);
        });
    });

    it('opens on the stats of both sample types with empty criteria and counters', async () => {
        renderPage();

        expect(screen.getByRole('heading', { name: 'Explore data' })).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Depth' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Time' })).toBeChecked();
        expect(screen.getByText('Pressure bin')).toBeInTheDocument();
        expect(screen.getByText('Time bin')).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Selected data stats/ })).toHaveAttribute('aria-selected', 'true');
        expect(await screen.findByTestId('explore-map')).toBeInTheDocument();

        expect(screen.getByLabelText('North')).toHaveValue('');
        for (const label of ['Projects', 'Samples', 'Particles', 'Images']) {
            expect(within(counter(label)).getByText('—')).toBeInTheDocument();
        }
        expect(screen.getByText(/Set your data selection criteria/)).toBeInTheDocument();
    });

    it('loads the projects of the filter without warning that the service is missing', async () => {
        const user = userEvent.setup();
        renderPage();

        // No warning while the first answer is on its way.
        expect(progress()).toBeInTheDocument();
        expect(screen.queryByText(UNAVAILABLE)).not.toBeInTheDocument();
        await waitFor(() => expect(progress()).not.toBeInTheDocument());
        expect(screen.queryByText(UNAVAILABLE)).not.toBeInTheDocument();

        await user.click(screen.getByRole('combobox', { name: 'EcoPart' }));
        expect(await screen.findByRole('option', { name: 'Tara Oceans 2009 (120)' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Green Edge 2016 (45)' })).toBeInTheDocument();
        // Before any filter, the map asks for every sample; the selection is not asked for.
        expect(callsTo('/explore/map')).toHaveLength(1);
        expect(callsTo('/explore/selection')).toHaveLength(0);
    });

    it('leaves the map alone when only the tab changes', async () => {
        const user = userEvent.setup();
        renderPage();
        await waitFor(() => expect(progress()).not.toBeInTheDocument());
        const renders = mapRendered.mock.calls.length;

        await user.click(screen.getByRole('tab', { name: /Selected data graphs/ }));
        expect(await screen.findByText('Log in to see the graphs of the selection.')).toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: /Exportable selection/ }));
        expect(await screen.findByRole('heading', { name: 'Exportable selection' })).toBeInTheDocument();

        expect(mapRendered).toHaveBeenCalledTimes(renders);
    });

    it('warns that the explore service is missing when the backend has no explore route', async () => {
        server.use(http.all('*/explore/*', () => new HttpResponse(null, { status: 404 })));
        renderPage();

        expect(await screen.findByText(UNAVAILABLE)).toBeInTheDocument();
        expect(screen.queryByText(/HTTP Error/)).not.toBeInTheDocument();
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

    it('shows the counters, projects and EcoTaxa categories of the selection once applied', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.click(screen.getByRole('button', { name: 'Apply filters' }));

        await waitFor(() => expect(within(counter('Particles')).getByText('125K')).toBeInTheDocument());
        expect(within(counter('Projects')).getByText('2')).toBeInTheDocument();
        expect(within(counter('Samples')).getByText('3')).toBeInTheDocument();
        expect(within(counter('Images')).getByText('4.2K')).toBeInTheDocument();
        expect(screen.getByText('Tara Oceans 2009 [1]')).toBeInTheDocument();
        expect(await screen.findByText('Rhizaria')).toBeInTheDocument();
        expect(screen.queryByText(PARTIAL_NOTE)).not.toBeInTheDocument();
    });

    it('says the EcoTaxa figures cover only some samples until the backend has read them all', async () => {
        // Only the intervals are faked (the EcoTaxa polling), still running with the clock.
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'], shouldAdvanceTime: true });
        server.use(ecotaxaHandler(1));
        const user = userEvent.setup();
        renderPage();

        await user.click(screen.getByRole('button', { name: 'Apply filters' }));
        expect(await screen.findByText(
            'EcoTaxa statistics are being read for 2 samples, the figures below cover the others and will complete shortly.',
        )).toBeInTheDocument();
        expect(screen.getByText('Copepoda')).toBeInTheDocument();
        expect(screen.queryByText('Rhizaria')).not.toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: /Exportable selection/ }));
        expect(await screen.findByText(/EcoTaxa statistics are being read for 1 sample,/)).toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: /Selected data stats/ }));
        act(() => vi.advanceTimersByTime(ECOTAXA_POLL_MS));
        expect(await screen.findByText('Rhizaria')).toBeInTheDocument();
        expect(screen.queryByText(PARTIAL_NOTE)).not.toBeInTheDocument();
        expect(callsTo('/explore/ecotaxa')).toHaveLength(2);
    });

    it('shows the message of a failed request', async () => {
        const user = userEvent.setup();
        server.use(http.post('*/explore/selection', () => HttpResponse.json({ message: 'Database is locked' }, { status: 500 })));
        renderPage();

        await user.click(screen.getByRole('button', { name: 'Apply filters' }));
        expect(await screen.findByText('Database is locked')).toBeInTheDocument();
    });

    it('applies the sample types with the other criteria, then shows the bin of their graphs only', async () => {
        const user = userEvent.setup();
        renderPage('/explore/exportable');
        expect(screen.getByRole('heading', { name: 'Exportable selection' })).toBeInTheDocument();

        await user.click(screen.getByRole('checkbox', { name: 'Depth' }));
        await user.click(screen.getByRole('checkbox', { name: 'Time' }));
        expect(screen.getByText('Check at least one sample type.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Apply filters' })).toBeDisabled();

        await user.click(screen.getByRole('checkbox', { name: 'Time' }));
        expect(screen.queryByText('Check at least one sample type.')).not.toBeInTheDocument();
        expect(screen.getByText('Pressure bin')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Apply filters' }));
        await waitFor(() => expect(screen.queryByText('Pressure bin')).not.toBeInTheDocument());
        expect(screen.getByText('Time bin')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Export selection/ })).toBeDisabled();
    });

    it('asks an anonymous user to log in for the graphs, and does not request them', async () => {
        const user = userEvent.setup();
        renderPage('/explore/graphs');

        expect(screen.getByText('Log in to see the graphs of the selection.')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Apply filters' }));
        await waitFor(() => expect(callsTo('/explore/selection')).toHaveLength(1));
        await waitFor(() => expect(progress()).not.toBeInTheDocument());

        expect(callsTo('/explore/graphs')).toHaveLength(0);
        expect(screen.queryByRole('region', { name: 'Particles abundance' })).not.toBeInTheDocument();
    });

    it('draws the graphs of the selection for a logged-in user, with the warnings of the backend', async () => {
        const user = userEvent.setup();
        loginAsUser();
        renderPage('/explore/graphs');

        expect(screen.queryByText(/Log in to see the graphs/)).not.toBeInTheDocument();
        await user.click(screen.getByRole('checkbox', { name: 'Time' }));
        await user.click(screen.getByRole('button', { name: 'Apply filters' }));

        const abundance = await screen.findByRole('region', { name: 'Particles abundance' });
        expect(await within(abundance).findByRole('img', { name: 'Particles abundance: 64-128 µm' })).toBeInTheDocument();
        expect(within(screen.getByRole('region', { name: 'CTD data' })).getByRole('img', { name: 'CTD data: chloro fluo' })).toBeInTheDocument();
        expect(screen.getByText('1 sample of a private project is not drawn')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Selected data graphs' })).toBeInTheDocument();
        expect(callsTo('/explore/graphs')).toHaveLength(1);
    });

    it('draws one block of graphs per sample type when both are searched', async () => {
        const user = userEvent.setup();
        loginAsUser();
        renderPage('/explore/graphs');

        await user.click(screen.getByRole('button', { name: 'Apply filters' }));
        expect(await screen.findByRole('heading', { name: 'Selected data graphs: depth profiles' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Selected data graphs: time series' })).toBeInTheDocument();
        await waitFor(() => expect(screen.getAllByText('1 sample of a private project is not drawn')).toHaveLength(2));
        expect(callsTo('/explore/graphs')).toHaveLength(2);
    });

    it('shows random images of the exportable selection, and asks for others on refresh', async () => {
        const user = userEvent.setup();
        renderPage('/explore/exportable');

        await user.click(screen.getByRole('button', { name: 'Apply filters' }));
        expect(await screen.findAllByRole('img', { name: /^Object / })).toHaveLength(4);
        expect(screen.getByText('tara_001 · 12.5 m')).toBeInTheDocument();
        expect(callsTo('/explore/images')).toHaveLength(1);

        await user.click(screen.getByRole('button', { name: 'Other random images' }));
        await waitFor(() => expect(callsTo('/explore/images')).toHaveLength(2));
    });
});
