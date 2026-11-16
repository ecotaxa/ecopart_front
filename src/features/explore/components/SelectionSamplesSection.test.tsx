import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { ExploreSummary, PressureClass } from '../types/explore.types';
import SelectionSamplesSection from './SelectionSamplesSection';

const pressureClasses = (counts: number[]): PressureClass[] => {
    const edges = [0, 50, 200, 500, 1000, 2000];
    return counts.map((nb_profiles, index) => ({ min_pressure: edges[index], max_pressure: edges[index + 1] ?? null, nb_profiles }));
};

const summary = (overrides: Partial<ExploreSummary> = {}): ExploreSummary => ({
    counts: { projects: 1, samples: 8, particles: 1000, images: 10 },
    sample_types: { depth: 8, time: 0, total: 8 },
    pressure_range: { min: 0, max: 2400 },
    size_range: { min: 60, max: 2000 },
    time_range: { start: '2012-01-01T00:00:00.000Z', end: '2020-01-01T00:00:00.000Z' },
    instruments: [{ label: 'UVP6LP', count: 8 }],
    max_pressure_histogram: [{ max_pressure: 100, nb_profiles: 1 }],
    max_pressure_classes: pressureClasses([1, 0, 2, 1, 3, 1]),
    profiles: [{ date: '2012-01-01T00:00:00.000Z', latitude: 43 }],
    ecotaxa_categories: [],
    classification: { fully_validated: 0, fully_predicted: 0, partially_validated: 0, partially_predicted: 0 },
    ecotaxa_partial: false,
    ecotaxa_pending: 0,
    ...overrides,
});

const renderSection = (value: ExploreSummary | null) =>
    render(<MemoryRouter><SelectionSamplesSection title="Selected samples" summary={value} /></MemoryRouter>);

describe('SelectionSamplesSection', () => {
    it('lists every class of maximum depth, empty ones included, with its share and the total', () => {
        renderSection(summary());

        const rows = within(screen.getByRole('table', { name: 'Profiles per maximum depth' })).getAllByRole('row').slice(1);
        expect(rows.map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))).toEqual([
            ['0 - 50', '1', '12.5%'],
            ['50 - 200', '0', '0%'],
            ['200 - 500', '2', '25%'],
            ['500 - 1000', '1', '12.5%'],
            ['1000 - 2000', '3', '37.5%'],
            ['≥ 2000', '1', '12.5%'],
            ['Total', '8', '100%'],
        ]);
    });

    it('shows no table without any maximum pressure', () => {
        renderSection(summary({ max_pressure_classes: [], max_pressure_histogram: [] }));

        expect(screen.queryByRole('table', { name: 'Profiles per maximum depth' })).not.toBeInTheDocument();
        expect(screen.getAllByText('No data')).toHaveLength(2);
    });

    it('draws the profiles by date and latitude', () => {
        renderSection(summary());

        expect(screen.getByRole('img', { name: 'Profiles by date and latitude' })).toBeInTheDocument();
    });
});
