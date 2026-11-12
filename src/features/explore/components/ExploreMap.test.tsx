import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { exploreFixtures } from '@/test/msw/explore.handlers';
import { loginAsUser } from '@/test/helpers/auth.helpers';
import ExploreMap from './ExploreMap';

const renderMap = () => render(
    <ExploreMap samples={exploreFixtures.mapSamples} bounds={null} drawing={false} onBoundsDrawn={() => undefined} fitKey={0} />,
);

const legend = () => screen.getByRole('group', { name: /Map legend/ });
const marker = (name: string) => screen.queryByRole('button', { name });

describe('ExploreMap', () => {
    beforeEach(() => {
        loginAsUser();
    });

    it('hides the samples of a legend entry when it is clicked, and shows them back', async () => {
        const user = userEvent.setup();
        renderMap();
        expect(await screen.findByRole('button', { name: 'ge_001' })).toBeInTheDocument();

        // ge_001 is the only private sample.
        const privateEntry = within(legend()).getByRole('button', { name: 'Private' });
        expect(privateEntry).toHaveAttribute('aria-pressed', 'true');
        await user.click(privateEntry);
        expect(privateEntry).toHaveAttribute('aria-pressed', 'false');
        expect(marker('ge_001')).not.toBeInTheDocument();
        expect(marker('tara_001')).toBeInTheDocument();

        // The UVP5 entry hides both Tara samples.
        await user.click(within(legend()).getByRole('button', { name: 'UVP5' }));
        expect(marker('tara_001')).not.toBeInTheDocument();
        expect(marker('tara_002')).not.toBeInTheDocument();
        expect(screen.getByText('No sample to show')).toBeInTheDocument();

        await user.click(within(legend()).getByRole('button', { name: 'Show all' }));
        for (const name of ['tara_001', 'tara_002', 'ge_001']) expect(marker(name)).toBeInTheDocument();
        expect(within(legend()).queryByRole('button', { name: 'Show all' })).not.toBeInTheDocument();
    });

    it('hides the samples of the user\'s projects with the "My projects" entry', async () => {
        const user = userEvent.setup();
        renderMap();
        expect(await screen.findByRole('button', { name: 'ge_001' })).toBeInTheDocument();

        await user.click(within(legend()).getByRole('button', { name: 'My projects' }));
        expect(marker('ge_001')).not.toBeInTheDocument();
        expect(marker('tara_001')).toBeInTheDocument();
    });

    it('draws the markers without a white outline', async () => {
        renderMap();
        const tara = await screen.findByRole('button', { name: 'tara_001' });
        expect(tara.querySelector('path')).toHaveAttribute('stroke', 'none');
    });
});
