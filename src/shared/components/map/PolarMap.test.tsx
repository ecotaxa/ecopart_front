import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PolarMap from './PolarMap';
import type { MapPoint } from './types';

const point = (id: string, latitude: number, longitude: number): MapPoint => ({
    id, latitude, longitude, label: `Sample ${id}`, color: '#e91e63', details: [`Project of ${id}`],
});

describe('PolarMap', () => {
    it('opens on the Mercator world view, with every point', () => {
        render(<PolarMap points={[point('med', 43.7, 7.3), point('arctic', 78.2, 15.6), point('so', -60, 30)]} />);

        expect(screen.getByRole('img', { name: /Mercator map/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sample med' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sample arctic' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sample so' })).toBeInTheDocument();
        expect(screen.queryByRole('group', { name: 'Pole' })).not.toBeInTheDocument();
    });

    it('opens the polar view on the pole most points are around and points to the others', async () => {
        const user = userEvent.setup();
        render(<PolarMap points={[point('med', 43.7, 7.3), point('arctic', 78.2, 15.6), point('so', -60, 30)]} />);

        await user.click(within(screen.getByRole('group', { name: 'Projection' })).getByRole('button', { name: 'Polar' }));
        expect(screen.getByRole('img', { name: /North pole view/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sample med' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sample arctic' })).toBeInTheDocument();
        // The Southern Ocean sample is off the northern disc.
        expect(screen.queryByRole('button', { name: 'Sample so' })).not.toBeInTheDocument();

        await user.click(within(screen.getByRole('group', { name: 'Pole' })).getByRole('button', { name: 'South pole' }));
        expect(screen.getByRole('img', { name: /South pole view/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sample so' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Sample arctic' })).not.toBeInTheDocument();
        expect(screen.getByText(/2 more near the/)).toBeInTheDocument();
    });

    it('shows the details of a clicked point', async () => {
        const user = userEvent.setup();
        render(<PolarMap points={[point('med', 43.7, 7.3)]} />);

        await user.click(screen.getByRole('button', { name: 'Sample med' }));
        expect(screen.getByText('Project of med')).toBeInTheDocument();
        expect(screen.getByText('Lat 43.70000, Lon 7.30000')).toBeInTheDocument();
    });

    it('says when there is nothing to show', () => {
        render(<PolarMap points={[point('bad', 120, 0)]} emptyMessage="No location available" />);
        expect(screen.getByText('No location available')).toBeInTheDocument();
    });
});
