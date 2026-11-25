import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import type { ExploreEcoTaxaGraphs, ExploreGraphs, GraphDataset } from '../types/explore.types';
import SelectionGraphs, { ECOTAXA_FILTERS_NOTE } from './SelectionGraphs';

const dataset = (keys: string[]): GraphDataset => ({
    keys,
    axis_labels: Object.fromEntries(keys.map((key) => [key, `${key} # l-1`])),
    series: Object.fromEntries(keys.map((key) => [key, [{
        sample_id: 1,
        sample_name: 'uvp5_sn201_001',
        positions: [0, 100, 200],
        values: [10, 4, 1],
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
    sumChildTaxa: true, onSumChildTaxaChange: vi.fn(), includePredicted: false, onIncludePredictedChange: vi.fn(), bin: 5, onBinChange: vi.fn(),
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
        render(<SelectionGraphs {...BASE_PROPS} mode="time" graphs={graphs} onSumChildTaxaChange={vi.fn()} comingSoon={[]} />);

        expect(card('LPM abundance')).toBeInTheDocument();
        expect(card('EcoTaxa classification')).toBeInTheDocument();
        expect(screen.getByText('Sum abundance of children categories')).toBeInTheDocument();
        expect(within(card('CTD data')).getByRole('radio', { name: 'Absolute' })).toBeChecked();
    });

    it('shows the EcoTaxa graph of time series as coming soon, without picker, and hides it', async () => {
        const user = userEvent.setup();
        render(<SelectionGraphs {...BASE_PROPS} mode="time" graphs={graphs} />);
        const ecotaxa = card('EcoTaxa classification');

        expect(within(ecotaxa).getByText(/Coming soon: the EcoTaxa graphs of time series are not computed yet/)).toBeInTheDocument();
        expect(within(ecotaxa).queryByRole('combobox')).not.toBeInTheDocument();
        expect(within(ecotaxa).queryByRole('img')).not.toBeInTheDocument();
        expect(screen.queryByRole('checkbox', { name: 'Sum abundance of children categories' })).not.toBeInTheDocument();

        await user.click(within(ecotaxa).getByRole('button', { name: 'Hide EcoTaxa classification' }));
        expect(screen.queryByRole('region', { name: 'EcoTaxa classification' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'EcoTaxa classification' }));
        expect(card('EcoTaxa classification')).toBeInTheDocument();
    });

    it('draws the EcoTaxa concentrations of depth profiles as steps, with the filters note and the backend warnings', () => {
        const ecotaxaGraphs: ExploreEcoTaxaGraphs = {
            ...dataset(['Appendicularia', 'Copepoda', 'detritus']),
            warnings: ['1 of the 3 samples drawn is not imported in EcoTaxa'],
            nb_samples_pending: 0,
        };
        render(<SelectionGraphs {...BASE_PROPS} mode="depth" graphs={graphs} ecotaxa={ecotaxaGraphs} />);
        const ecotaxa = card('EcoTaxa concentrations');

        expect(within(ecotaxa).getByText(ECOTAXA_FILTERS_NOTE)).toBeInTheDocument();
        expect(ECOTAXA_FILTERS_NOTE).toMatch(/descent filter/);
        expect(within(ecotaxa).getByText('1 of the 3 samples drawn is not imported in EcoTaxa')).toBeInTheDocument();
        // The concentrations served apart, not the empty dataset of the other graphs; the two most abundant drawn.
        expect(within(ecotaxa).getAllByRole('img').map((img) => img.getAttribute('aria-label'))).toEqual([
            'EcoTaxa concentrations: Appendicularia', 'EcoTaxa concentrations: Copepoda',
        ]);
        expect(within(ecotaxa).getByRole('button', { name: 'detritus' })).toBeInTheDocument();
        expect(within(card('CTD data')).queryByText(ECOTAXA_FILTERS_NOTE)).not.toBeInTheDocument();
    });

    it('shows the filters note on the EcoTaxa card before any concentration arrives', () => {
        render(<SelectionGraphs {...BASE_PROPS} mode="depth" graphs={null} />);

        expect(within(card('EcoTaxa concentrations')).getByText(ECOTAXA_FILTERS_NOTE)).toBeInTheDocument();
    });

    it('reports the "include predicted objects" option', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<SelectionGraphs {...BASE_PROPS} mode="depth" graphs={graphs} onIncludePredictedChange={onChange} />);

        const checkbox = within(card('EcoTaxa concentrations')).getByRole('checkbox', { name: 'Include predicted objects' });
        expect(checkbox).not.toBeChecked();
        await user.click(checkbox);
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('says in the CTD card why samples have no CTD curve', () => {
        const notes = ['2 of the 3 samples drawn have no CTD data imported', '1 CTD file could not be read: uvp5_sn201_003'];
        render(<SelectionGraphs {...BASE_PROPS} mode="depth" graphs={{ ...graphs, ctd_warnings: notes }} />);

        for (const note of notes) expect(within(card('CTD data')).getByText(note)).toBeInTheDocument();
        expect(within(card('Particles abundance')).queryByText(notes[0])).not.toBeInTheDocument();
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
        render(<SelectionGraphs {...BASE_PROPS} mode="depth" graphs={graphs} onSumChildTaxaChange={vi.fn()} comingSoon={[]} />);
        const ecotaxa = card('EcoTaxa concentrations');

        await user.click(within(ecotaxa).getByRole('button', { name: 'detritus' }));
        expect(within(ecotaxa).getByRole('img', { name: 'EcoTaxa concentrations: detritus' })).toBeInTheDocument();

        await user.click(within(ecotaxa).getByRole('button', { name: 'Reset EcoTaxa concentrations' }));
        expect(within(ecotaxa).queryByRole('img', { name: /detritus/ })).not.toBeInTheDocument();
    });

    it('reports the "sum children" option', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<SelectionGraphs {...BASE_PROPS} mode="depth" graphs={graphs} onSumChildTaxaChange={onChange} comingSoon={[]} />);

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
        expect(within(aggregation).getByRole('slider', { name: 'Time bin' })).toHaveAttribute('aria-valuetext', '3 h');
        expect(within(aggregation).queryByRole('slider', { name: 'Pressure bin' })).not.toBeInTheDocument();
        await user.click(within(aggregation).getByRole('button', { name: 'Reset' }));
        expect(onBinChange).toHaveBeenCalledWith(1);

        rerender(<SelectionGraphs {...BASE_PROPS} mode="time" graphs={graphs} bin={1} onBinChange={onBinChange} />);
        expect(within(aggregation).getByRole('slider', { name: 'Time bin' })).toHaveAttribute('aria-valuetext', '1 h');
        expect(within(aggregation).queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
    });

    it('moves the time bin over the steps the binned export accepts only', async () => {
        const user = userEvent.setup();
        const onBinChange = vi.fn();
        render(<SelectionGraphs {...BASE_PROPS} mode="time" graphs={graphs} bin={4} onBinChange={onBinChange} />);

        const slider = within(card('Data aggregation')).getByRole('slider', { name: 'Time bin' });
        // One notch per step: from 4 h the next one is 6 h, never 4.5 or 5 h.
        slider.focus();
        await user.keyboard('{ArrowRight}');
        expect(onBinChange).toHaveBeenLastCalledWith(6);
        expect(slider).toHaveAttribute('aria-valuetext', '6 h');
        await user.keyboard('{End}');
        expect(onBinChange).toHaveBeenLastCalledWith(24);
        await user.keyboard('{Home}');
        expect(onBinChange).toHaveBeenLastCalledWith(0.5);
    });

    it('takes a typed pressure bin within its bounds', async () => {
        const user = userEvent.setup();
        const onBinChange = vi.fn();
        render(<SelectionGraphs {...BASE_PROPS} mode="depth" graphs={graphs} bin={5} onBinChange={onBinChange} />);

        const field = within(card('Data aggregation')).getByRole('textbox', { name: 'Pressure bin (dbar)' });
        await user.clear(field);
        await user.type(field, '25');
        expect(onBinChange).toHaveBeenLastCalledWith(25);
        expect(within(card('Data aggregation')).getByRole('slider', { name: 'Pressure bin' })).toHaveAttribute('aria-valuetext', '25 dbar');

        // Out of bounds: not taken, and given up on leaving the field.
        onBinChange.mockClear();
        await user.type(field, '0');
        expect(field).toHaveValue('250');
        expect(onBinChange).not.toHaveBeenCalled();
        await user.tab();
        expect(field).toHaveValue('25');
    });

    it('names the sample of a hovered curve, with its details, and keeps it open with its links on click', async () => {
        const user = userEvent.setup();
        const sampleDetails = new Map([[1, {
            details: ['Tara Oceans 2009 [1]', 'UVP5HD · Public'],
            links: [
                { label: 'Open sample', to: '/projects/1/samples/1', newTab: true },
                { label: 'Open project', to: '/projects/1', newTab: true },
            ],
        }]]);
        render(
            <MemoryRouter>
                <SelectionGraphs {...BASE_PROPS} mode="depth" graphs={graphs} sampleDetails={sampleDetails} />
            </MemoryRouter>,
        );

        const chart = within(card('CTD data')).getByRole('img', { name: 'CTD data: Chloro fluo' });
        const curve = within(chart).getByTestId('curve');
        await user.hover(curve);
        const tooltip = screen.getByRole('tooltip', { name: 'uvp5_sn201_001' });
        expect(within(tooltip).getByText('Tara Oceans 2009 [1]')).toBeInTheDocument();
        expect(within(tooltip).getByText('UVP5HD · Public')).toBeInTheDocument();
        // The hover popup cannot be reached: it only says where the links are.
        expect(within(tooltip).queryByRole('link')).not.toBeInTheDocument();
        expect(within(tooltip).getByText('Click the curve for its links')).toBeInTheDocument();
        await user.unhover(curve);
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

        await user.click(curve);
        await user.unhover(curve);
        const popup = screen.getByRole('dialog', { name: 'uvp5_sn201_001' });
        expect(within(popup).getByRole('link', { name: 'Open sample' })).toHaveAttribute('href', '/projects/1/samples/1');
        const projectLink = within(popup).getByRole('link', { name: 'Open project' });
        expect(projectLink).toHaveAttribute('href', '/projects/1');
        expect(projectLink).toHaveAttribute('target', '_blank');
        await user.click(within(popup).getByRole('button', { name: 'Close' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
