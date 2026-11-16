import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

    describe('on a wide map', () => {
        const MAP_WIDTH = 1600;
        const MAP_HEIGHT = 400;
        const spread = [point('arctic', 78.2, 15.6), point('so', -65, 30), point('pacific', 10, 175), point('fiji', -18, -178)];
        /** The screen position of a point's marker (its first copy). */
        const markerXY = (name: string) => {
            const transform = screen.getAllByRole('button', { name: `Sample ${name}` })[0].getAttribute('transform') ?? '';
            const [, x, y] = /translate\(([-\d.e]+),([-\d.e]+)\)/.exec(transform) ?? [];
            return [Number(x), Number(y)];
        };

        beforeEach(() => {
            vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(MAP_WIDTH);
            if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => { /* no-op */ };
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('grows taller with its width, up to its max height', () => {
            render(<PolarMap points={spread} height={MAP_HEIGHT} maxHeight={640} />);
            expect(screen.getByRole('img', { name: /Mercator map/ })).toHaveAttribute('height', '640');
        });

        it('zooms out until the points of every latitude are in view', () => {
            render(<PolarMap points={spread} height={MAP_HEIGHT} />);
            for (const name of ['arctic', 'so']) {
                const [, y] = markerXY(name);
                expect(y).toBeGreaterThan(0);
                expect(y).toBeLessThan(MAP_HEIGHT);
            }
        });

        it('frames the points around the antimeridian together', () => {
            render(<PolarMap points={[point('pacific', 10, 175), point('fiji', -18, -178)]} height={MAP_HEIGHT} />);
            const [pacificX] = markerXY('pacific');
            const fijiXs = screen.getAllByRole('button', { name: 'Sample fiji' })
                .map((marker) => Number(/translate\(([-\d.e]+),/.exec(marker.getAttribute('transform') ?? '')?.[1]));
            // A copy of Fiji sits just east of the Pacific point, both near the centre.
            expect(fijiXs.some((x) => x > pacificX && x - pacificX < MAP_WIDTH / 2)).toBe(true);
            expect(Math.abs(pacificX - MAP_WIDTH / 2)).toBeLessThan(MAP_WIDTH / 2);
        });

        it('with a fitKey, keeps its view on new points until the key changes', () => {
            const med = point('med', 43.7, 7.3);
            const { rerender } = render(<PolarMap points={[med]} height={MAP_HEIGHT} fitKey={0} />);
            const framedOnMed = markerXY('med');

            // Same key: the new points come into the view as it is.
            rerender(<PolarMap points={[med, ...spread]} height={MAP_HEIGHT} fitKey={0} />);
            expect(markerXY('med')).toEqual(framedOnMed);

            // A new key frames the next new points.
            rerender(<PolarMap points={[med, ...spread]} height={MAP_HEIGHT} fitKey={1} />);
            expect(markerXY('med')).toEqual(framedOnMed);
            rerender(<PolarMap points={[med, spread[0]]} height={MAP_HEIGHT} fitKey={1} />);
            expect(markerXY('med')).not.toEqual(framedOnMed);
        });

        it('without a fitKey, frames every new set of points', () => {
            const med = point('med', 43.7, 7.3);
            const { rerender } = render(<PolarMap points={[med]} height={MAP_HEIGHT} />);
            const framedOnMed = markerXY('med');

            rerender(<PolarMap points={[med, ...spread]} height={MAP_HEIGHT} />);
            expect(markerXY('med')).not.toEqual(framedOnMed);
        });

        it('outlines the markers in white unless told otherwise', () => {
            const { unmount } = render(<PolarMap points={[point('med', 43.7, 7.3)]} height={MAP_HEIGHT} />);
            expect(screen.getByRole('button', { name: 'Sample med' }).querySelector('path')).toHaveAttribute('stroke', '#fff');
            unmount();

            render(<PolarMap points={[point('med', 43.7, 7.3)]} height={MAP_HEIGHT} markerOutline={null} />);
            expect(screen.getByRole('button', { name: 'Sample med' }).querySelector('path')).toHaveAttribute('stroke', 'none');
        });

        it('never drags the world off the top of the map', () => {
            render(<PolarMap points={spread} height={MAP_HEIGHT} />);
            const map = screen.getByRole('img', { name: /Mercator map/ });
            fireEvent.pointerDown(map, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
            fireEvent.pointerMove(map, { button: 0, clientX: 100, clientY: 3000, pointerId: 1 });
            fireEvent.pointerUp(map, { button: 0, clientX: 100, clientY: 3000, pointerId: 1 });

            // Held with the North pole edge at the top: the Arctic sample stays on the map.
            expect(markerXY('arctic')[1]).toBeLessThan(MAP_HEIGHT);
        });
    });

    describe('when its size changes', () => {
        const MAP_HEIGHT = 400;
        const world = [point('arctic', 78.2, 15.6), point('so', -65, 30), point('pacific', 10, 175), point('fiji', -18, -178)];
        // A small box off Marseille.
        const box = [point('med', 43.2, 5.2), point('med2', 43.3, 5.4)];
        let width = 1600;
        let resized: Array<() => void> = [];
        /** Gives the map a new width, as a scrollbar showing up or going away does. */
        const resizeTo = (next: number) => {
            width = next;
            act(() => resized.forEach((notify) => notify()));
        };
        const markerXY = (name: string) => {
            const transform = screen.getAllByRole('button', { name: `Sample ${name}` })[0].getAttribute('transform') ?? '';
            const [, x, y] = /translate\(([-\d.e]+),([-\d.e]+)\)/.exec(transform) ?? [];
            return [Number(x), Number(y)];
        };
        const scaleLabel = () => screen.getByLabelText(/^Scale: /).getAttribute('aria-label');

        beforeEach(() => {
            width = 1600;
            resized = [];
            vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
            vi.stubGlobal('ResizeObserver', class {
                constructor(notify: () => void) { resized.push(notify); }
                observe() { /* no-op */ }
                unobserve() { /* no-op */ }
                disconnect() { /* no-op */ }
            });
        });

        afterEach(() => {
            vi.restoreAllMocks();
            vi.unstubAllGlobals();
        });

        it('still frames the next new points when it is resized while they load', () => {
            const { rerender } = render(<PolarMap points={world} height={MAP_HEIGHT} fitKey={0} />);
            const worldScale = scaleLabel();

            // A selection is applied: its points are still loading when a scrollbar shows up.
            rerender(<PolarMap points={world} height={MAP_HEIGHT} fitKey={1} />);
            resizeTo(1585);
            rerender(<PolarMap points={box} height={MAP_HEIGHT} fitKey={1} />);

            expect(scaleLabel()).not.toBe(worldScale);
            const [x, y] = markerXY('med');
            expect(Math.abs(x - 1585 / 2)).toBeLessThan(100);
            expect(Math.abs(y - MAP_HEIGHT / 2)).toBeLessThan(100);
        });

        it('keeps the place and the zoom on view', async () => {
            const user = userEvent.setup();
            render(<PolarMap points={[...world, ...box]} height={MAP_HEIGHT} />);
            await user.click(screen.getByRole('button', { name: 'Zoom in' }));
            await user.click(screen.getByRole('button', { name: 'Zoom in' }));
            const [x, y] = markerXY('med');

            resizeTo(1200);

            // Same zoom on a map 3/4 as wide: the marker keeps its place relative to the centre, scaled.
            const [nextX, nextY] = markerXY('med');
            expect(nextX - 1200 / 2).toBeCloseTo((x - 1600 / 2) * 0.75, 0);
            expect(nextY - MAP_HEIGHT / 2).toBeCloseTo((y - MAP_HEIGHT / 2) * 0.75, 0);
        });
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
