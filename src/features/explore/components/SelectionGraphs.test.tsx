import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ExploreGraphs, GraphDataset } from '../types/explore.types';
import SelectionGraphs from './SelectionGraphs';

const dataset = (keys: string[]): GraphDataset => ({
    keys,
    axis_labels: Object.fromEntries(keys.map((key) => [key, `${key} # l-1`])),
    series: Object.fromEntries(keys.map((key) => [key, [{
        sample_id: 1,
        sample_name: 'uvp5_sn201_001',
        points: [{ position: 0, value: 10 }, { position: 100, value: 4 }, { position: 200, value: 1 }],
    }]])),
});

/** Reduced size classes, numbered in their axis labels as the backend does (cl7 = 64-128 µm). */
const sizeClasses = (prefix: 'cl' | 'bv', classes: Record<string, number>): GraphDataset => {
    const keys = Object.keys(classes);
    const base = dataset(keys);
    return {
        ...base,
        axis_labels: Object.fromEntries(keys.map((key) => [key, `Particle red. class ${prefix}${classes[key]} (${key}) # l-1`])),
    };
};

const graphs: ExploreGraphs = {
    abundance: sizeClasses('cl', { '16-32µm': 5, '64-128µm': 7, '128-256µm': 8, '256-512µm': 9 }),
    biovolume: sizeClasses('bv', { '64-128µm': 7, '128-256µm': 8 }),
    ctd: dataset(['Chloro fluo', 'Conductivity']),
    ecotaxa: dataset(['Copepoda', 'Living', 'detritus']),
    warnings: [],
};

const BASE_PROPS = {
    sumChildTaxa: true, onSumChildTaxaChange: vi.fn(), bin: 5, onBinChange: vi.fn(),
    sizeClasses: "reduced" as const, onSizeClassesChange: vi.fn(),
};

const card = (name: string) => screen.getByRole('region', { name });

describe('SelectionGraphs', () => {
    it('draws no size class until picked, and the first two keys of the other graphs, as depth profiles', () => {
        render(<SelectionGraphs {...BASE_PROPS} mode="depth" graphs={graphs} onSumChildTaxaChange={vi.fn()} />);

        for (const name of ['Particles abundance', 'Particles biovolume']) {
            expect(within(card(name)).queryAllByRole('img')).toHaveLength(0);
            expect(within(card(name)).getByText('No data')).toBeInTheDocument();
        }
        const ctd = card('CTD data');
        expect(within(ctd).getByRole('img', { name: 'CTD data: Chloro fluo' })).toBeInTheDocument();
        expect(within(ctd).getByRole('img', { name: 'CTD data: Conductivity' })).toBeInTheDocument();
        expect(within(ctd).getAllByText('Depth [m]', { selector: 'text' })).toHaveLength(2);
        expect(within(ctd).getByRole('radio', { name: 'log10' })).toBeChecked();
        // The time scale only exists on the time series page.
        expect(screen.queryByText('Scale time')).not.toBeInTheDocument();
        expect(card('EcoTaxa concentrations')).toBeInTheDocument();
    });

    it('uses the time series wording and time scale on the time page', () => {
        render(<SelectionGraphs {...BASE_PROPS} mode="time" graphs={graphs} onSumChildTaxaChange={vi.fn()} />);

        expect(card('LPM abundance')).toBeInTheDocument();
        expect(card('EcoTaxa classification')).toBeInTheDocument();
        expect(screen.getByText('Sum abundance of children categories')).toBeInTheDocument();
        expect(within(card('CTD data')).getByRole('radio', { name: 'Absolute' })).toBeChecked();
    });

    it('hides a graph and brings it back', async () => {
        const user = userEvent.setup();
        render(<SelectionGraphs {...BASE_PROPS} mode="depth" graphs={graphs} onSumChildTaxaChange={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: 'Hide CTD data' }));
        expect(screen.queryByRole('region', { name: 'CTD data' })).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'CTD data' }));
        expect(card('CTD data')).toBeInTheDocument();
    });

    it('adds a taxon from the available taxa, and resets the graph', async () => {
        const user = userEvent.setup();
        render(<SelectionGraphs {...BASE_PROPS} mode="depth" graphs={graphs} onSumChildTaxaChange={vi.fn()} />);
        const ecotaxa = card('EcoTaxa concentrations');

        await user.click(within(ecotaxa).getByRole('button', { name: 'detritus' }));
        expect(within(ecotaxa).getByRole('img', { name: 'EcoTaxa concentrations: detritus' })).toBeInTheDocument();

        await user.click(within(ecotaxa).getByRole('button', { name: 'Reset EcoTaxa concentrations' }));
        expect(within(ecotaxa).queryByRole('img', { name: /detritus/ })).not.toBeInTheDocument();
    });

    it('reports the "sum children" option', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<SelectionGraphs {...BASE_PROPS} mode="depth" graphs={graphs} onSumChildTaxaChange={onChange} />);

        await user.click(screen.getByRole('checkbox', { name: 'Sum concentrations of children categories' }));
        expect(onChange).toHaveBeenCalledWith(false);
    });

    it('picks size classes with the legacy presets, numbered as in legacy EcoPart', async () => {
        const user = userEvent.setup();
        render(<SelectionGraphs {...BASE_PROPS} mode="depth" graphs={graphs} />);
        const abundance = card('Particles abundance');

        await user.click(within(abundance).getByRole('button', { name: 'UVP class 6-12' }));
        // cl5 (16-32µm) is outside 6-12.
        expect(within(abundance).getAllByRole('img').map((img) => img.getAttribute('aria-label'))).toEqual([
            'Particles abundance: 64-128µm', 'Particles abundance: 128-256µm', 'Particles abundance: 256-512µm',
        ]);
        expect(within(abundance).getByText('07 : 64-128µm')).toBeInTheDocument();

        await user.click(within(abundance).getByRole('button', { name: 'Class 1-5' }));
        expect(within(abundance).getAllByRole('img')).toHaveLength(1);
        expect(within(abundance).getByRole('img', { name: 'Particles abundance: 16-32µm' })).toBeInTheDocument();

        await user.click(within(abundance).getByRole('button', { name: 'All' }));
        expect(within(abundance).getAllByRole('img')).toHaveLength(4);

        await user.click(within(abundance).getByRole('button', { name: 'None' }));
        expect(within(abundance).queryAllByRole('img')).toHaveLength(0);
        // The other size class graph keeps its own picks.
        expect(within(card('Particles biovolume')).queryAllByRole('img')).toHaveLength(0);
    });

    it('reports the histogram picked, and offers the presets of the detailed one', async () => {
        const user = userEvent.setup();
        const onSizeClassesChange = vi.fn();
        const detailed: ExploreGraphs = {
            ...graphs,
            size_classes: 'detailed',
            abundance: sizeClasses('cl', { '1-1.26µm': 1, '50.8-64µm': 18, '64-80.6µm': 19 }),
        };
        render(<SelectionGraphs {...BASE_PROPS} mode="depth" graphs={detailed} sizeClasses="detailed" onSizeClassesChange={onSizeClassesChange} />);
        const abundance = card('Particles abundance');

        expect(screen.getByRole('radio', { name: 'Detailed (45 classes)' })).toBeChecked();
        await user.click(screen.getByRole('radio', { name: 'Reduced (15 classes)' }));
        expect(onSizeClassesChange).toHaveBeenCalledWith('reduced');

        expect(within(abundance).queryByRole('button', { name: 'UVP class 6-12' })).not.toBeInTheDocument();
        await user.click(within(abundance).getByRole('button', { name: 'UVP class 17-45' }));
        expect(within(abundance).getAllByRole('img').map((img) => img.getAttribute('aria-label'))).toEqual([
            'Particles abundance: 50.8-64µm', 'Particles abundance: 64-80.6µm',
        ]);
        await user.click(within(abundance).getByRole('button', { name: 'Class 1-16' }));
        expect(within(abundance).getByRole('img', { name: 'Particles abundance: 1-1.26µm' })).toBeInTheDocument();
        expect(within(abundance).getByText('01 : 1-1.26µm')).toBeInTheDocument();
    });

    it('shows the bin of its sample type and resets it', async () => {
        const user = userEvent.setup();
        const onBinChange = vi.fn();
        const { rerender } = render(<SelectionGraphs {...BASE_PROPS} mode="time" graphs={graphs} bin={3} onBinChange={onBinChange} />);

        const aggregation = card('Data aggregation');
        expect(within(aggregation).getByRole('slider', { name: 'Time bin' })).toHaveValue('3');
        expect(within(aggregation).queryByRole('slider', { name: 'Pressure bin' })).not.toBeInTheDocument();
        await user.click(within(aggregation).getByRole('button', { name: 'Reset' }));
        expect(onBinChange).toHaveBeenCalledWith(1);

        rerender(<SelectionGraphs {...BASE_PROPS} mode="time" graphs={graphs} bin={1} onBinChange={onBinChange} />);
        expect(within(aggregation).getByRole('slider', { name: 'Time bin' })).toHaveValue('1');
        expect(within(aggregation).queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
    });

    it('says the graphs are being computed when it takes long', () => {
        vi.useFakeTimers();
        try {
            render(<SelectionGraphs {...BASE_PROPS} mode="depth" graphs={graphs} computing />);
            expect(screen.queryByText(/Computing the graphs/)).not.toBeInTheDocument();
            act(() => { vi.advanceTimersByTime(1000); });
            expect(screen.getByText(/Computing the graphs/)).toBeInTheDocument();
        } finally {
            vi.useRealTimers();
        }
    });

    it('shows empty graphs without data', () => {
        render(<SelectionGraphs {...BASE_PROPS} mode="depth" graphs={null} onSumChildTaxaChange={vi.fn()} />);
        expect(screen.getAllByText('No data')).toHaveLength(4);
    });
});
