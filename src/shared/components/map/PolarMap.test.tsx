import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
        expect(screen.getByLabelText(/^Scale: [\d,.]+ km$/)).toBeInTheDocument();
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

    describe('with thousands of points', () => {
        const MAP_WIDTH = 800;
        const MAP_HEIGHT = 320;
        // Every point at the same place: framed, they sit at the centre of the map.
        const crowd = Array.from({ length: 600 }, (_, index) => point(String(index), 43.7, 7.3));

        beforeEach(() => {
            vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(MAP_WIDTH);
            // JSDOM has no canvas: nothing is painted, the markers are still laid out.
            vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
            if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => { /* no-op */ };
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('paints the markers on a canvas instead of one SVG element each', () => {
            const { container } = render(<PolarMap points={crowd} height={MAP_HEIGHT} />);

            expect(container.querySelector('canvas')).toBeInTheDocument();
            expect(screen.queryAllByRole('button', { name: /^Sample / })).toHaveLength(0);
        });

        it('opens a painted marker on click, and closes it on a click elsewhere', () => {
            render(<PolarMap points={crowd} height={MAP_HEIGHT} />);
            const map = screen.getByRole('img', { name: /Mercator map/ });
            const click = (clientX: number, clientY: number) => {
                fireEvent.pointerDown(map, { button: 0, clientX, clientY, pointerId: 1 });
                fireEvent.pointerUp(map, { button: 0, clientX, clientY, pointerId: 1 });
            };

            click(MAP_WIDTH / 2 + 2, MAP_HEIGHT / 2 - 2);
            expect(screen.getByText('Sample 0')).toBeInTheDocument();
            expect(screen.getByText('Lat 43.70000, Lon 7.30000')).toBeInTheDocument();

            click(20, MAP_HEIGHT - 20);
            expect(screen.queryByText('Sample 0')).not.toBeInTheDocument();
        });
    });
});
