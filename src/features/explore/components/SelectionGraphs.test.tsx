import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

const graphs: ExploreGraphs = {
    abundance: dataset(['64-128µm', '128-256µm', '256-512µm']),
    biovolume: dataset(['64-128µm', '128-256µm']),
    ctd: dataset(['Chloro fluo', 'Conductivity']),
    ecotaxa: dataset(['Copepoda', 'Living', 'detritus']),
    warnings: [],
};

const card = (name: string) => screen.getByRole('region', { name });

describe('SelectionGraphs', () => {
    it('draws the first two keys of every graph, as depth profiles', () => {
        render(<SelectionGraphs mode="depth" graphs={graphs} sumChildTaxa onSumChildTaxaChange={vi.fn()} />);

        const abundance = card('Particles abundance');
        expect(within(abundance).getByRole('img', { name: 'Particles abundance: 64-128µm' })).toBeInTheDocument();
        expect(within(abundance).getByRole('img', { name: 'Particles abundance: 128-256µm' })).toBeInTheDocument();
        expect(within(abundance).queryByRole('img', { name: /256-512µm/ })).not.toBeInTheDocument();
        expect(within(abundance).getAllByText('Depth [m]', { selector: 'text' })).toHaveLength(2);
        expect(within(abundance).getByRole('radio', { name: 'log10' })).toBeChecked();
        // The time scale only exists on the time series page.
        expect(screen.queryByText('Scale time')).not.toBeInTheDocument();
        expect(card('EcoTaxa concentrations')).toBeInTheDocument();
    });

    it('uses the time series wording and time scale on the time page', () => {
        render(<SelectionGraphs mode="time" graphs={graphs} sumChildTaxa onSumChildTaxaChange={vi.fn()} />);

        expect(card('LPM abundance')).toBeInTheDocument();
        expect(card('EcoTaxa classification')).toBeInTheDocument();
        expect(screen.getByText('Sum abundance of children categories')).toBeInTheDocument();
        expect(within(card('CTD data')).getByRole('radio', { name: 'Absolute' })).toBeChecked();
    });

    it('hides a graph and brings it back', async () => {
        const user = userEvent.setup();
        render(<SelectionGraphs mode="depth" graphs={graphs} sumChildTaxa onSumChildTaxaChange={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: 'Hide CTD data' }));
        expect(screen.queryByRole('region', { name: 'CTD data' })).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'CTD data' }));
        expect(card('CTD data')).toBeInTheDocument();
    });

    it('adds a taxon from the available taxa, and resets the graph', async () => {
        const user = userEvent.setup();
        render(<SelectionGraphs mode="depth" graphs={graphs} sumChildTaxa onSumChildTaxaChange={vi.fn()} />);
        const ecotaxa = card('EcoTaxa concentrations');

        await user.click(within(ecotaxa).getByRole('button', { name: 'detritus' }));
        expect(within(ecotaxa).getByRole('img', { name: 'EcoTaxa concentrations: detritus' })).toBeInTheDocument();

        await user.click(within(ecotaxa).getByRole('button', { name: 'Reset EcoTaxa concentrations' }));
        expect(within(ecotaxa).queryByRole('img', { name: /detritus/ })).not.toBeInTheDocument();
    });

    it('reports the "sum children" option', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<SelectionGraphs mode="depth" graphs={graphs} sumChildTaxa onSumChildTaxaChange={onChange} />);

        await user.click(screen.getByRole('checkbox', { name: 'Sum concentrations of children categories' }));
        expect(onChange).toHaveBeenCalledWith(false);
    });

    it('shows empty graphs without data', () => {
        render(<SelectionGraphs mode="depth" graphs={null} sumChildTaxa onSumChildTaxaChange={vi.fn()} />);
        expect(screen.getAllByText('No data')).toHaveLength(4);
    });
});
