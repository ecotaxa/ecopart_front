import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SampleQcGraphs, QcBinnedDepthProfile, QcAxisScale } from '../api/projects.api';
import { QcSampleCard } from './QcSampleCard';

const binned = (
    scale: QcAxisScale,
    series: { label: string; unit: string; values: number[] }[]
): QcBinnedDepthProfile => ({
    bin_size_m: 1,
    suggested_scale: scale,
    series: series.map((s) => ({
        label: s.label,
        unit: s.unit,
        points: s.values.map((value, i) => ({ depth_m: i * 5, value })),
    })),
});

const makeSample = (overrides: Partial<SampleQcGraphs> = {}): SampleQcGraphs => ({
    sample_id: null,
    sample_name: 'omer2_5',
    instrument_model: 'UVP5HD',
    depth_unit: 'm',
    visual_qc_status_label: 'NOT_IMPORTED',
    image_depth_profile: {
        points: [
            { image_index: 0, image_id: '10', depth_m: 5, is_selected: true },
            { image_index: 1, image_id: '11', depth_m: 10, is_selected: true },
        ],
        filter_first_image: '10',
        filter_last_image: '11',
        total_images: 2,
        selected_images: 2,
    },
    imaged_volume_profile: binned('linear', [{ label: 'imaged volume', unit: 'L', values: [1, 2] }]),
    // The all-zero "3 px" class exercises the log empty-series drop from inside the card too.
    particle_lpm_profile: binned('log', [
        { label: '1 px', unit: 'count', values: [3, 2] },
        { label: '2 px', unit: 'count', values: [1, 0] },
        { label: '3 px', unit: 'count', values: [0, 0] },
    ]),
    black_profile: null,
    image_filtering: {
        first_image: '10',
        last_image: '99999',
        last_image_used: '11',
        removed_images: { count: 3, percent: 12.6 },
    },
    ...overrides,
});

describe('components/QcSampleCard', () => {
    it('TC-AB6: renders the sample header and every graph title', () => {
        render(<QcSampleCard sample={makeSample()} onRemove={() => {}} />);
        expect(screen.getByText('Sample : omer2_5')).toBeInTheDocument();
        expect(screen.getByText(/pressure of each image/i)).toBeInTheDocument();
        expect(screen.getByText(/Vertical profile of imaged volume/i)).toBeInTheDocument();
        expect(screen.getByText(/Vertical profile of black/i)).toBeInTheDocument();
        expect(screen.getByText(/particle \(LPM\)/i)).toBeInTheDocument();
    });

    it('TC-AB7: REMOVE FROM IMPORT calls onRemove with the sample name', async () => {
        const onRemove = vi.fn();
        const user = userEvent.setup();
        render(<QcSampleCard sample={makeSample()} onRemove={onRemove} />);

        await user.click(screen.getByRole('button', { name: /REMOVE FROM IMPORT/i }));

        expect(onRemove).toHaveBeenCalledTimes(1);
        expect(onRemove).toHaveBeenCalledWith('omer2_5');
    });

    it('TC-AB8: removeDisabled disables the remove button', () => {
        render(<QcSampleCard sample={makeSample()} onRemove={() => {}} removeDisabled />);
        expect(screen.getByRole('button', { name: /REMOVE FROM IMPORT/i })).toBeDisabled();
    });

    it('TC-AB9: displays the image-filtering metadata with a rounded removed percentage', () => {
        render(<QcSampleCard sample={makeSample()} onRemove={() => {}} />);
        expect(screen.getByDisplayValue('10')).toBeInTheDocument();      // First image
        expect(screen.getByDisplayValue('99999')).toBeInTheDocument();   // Last image
        expect(screen.getByDisplayValue('11')).toBeInTheDocument();      // Last used
        expect(screen.getByDisplayValue('3 / 13%')).toBeInTheDocument(); // 12.6% -> 13%
    });

    it('TC-AB10: shows the "No dark frames" placeholder when black_profile is null', () => {
        render(<QcSampleCard sample={makeSample({ black_profile: null })} onRemove={() => {}} />);
        expect(screen.getByText(/No dark frames for this instrument/i)).toBeInTheDocument();
    });

    it('TC-AB11: renders the black profile chart (no placeholder) when black_profile is present', () => {
        const withBlack = makeSample({
            black_profile: binned('log', [
                { label: '1 px', unit: 'count', values: [5, 3] },
                { label: '2 px', unit: 'count', values: [2, 1] },
                { label: '3 px', unit: 'count', values: [1, 0] },
            ]),
        });
        render(<QcSampleCard sample={withBlack} onRemove={() => {}} />);

        expect(screen.queryByText(/No dark frames for this instrument/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Vertical profile of black/i)).toBeInTheDocument();
    });

    describe('Accessibility Tests', () => {
        it('TC-AB13: metadata fields are label-associated and read-only (not disabled)', () => {
            render(<QcSampleCard sample={makeSample()} onRemove={() => {}} />);

            for (const label of ['First image', 'Last image', 'Last used', 'Removed images']) {
                const input = screen.getByLabelText(new RegExp(label, 'i'));
                // Read-only (rather than disabled) keeps the value legible and the field reachable by
                // keyboard / screen reader, while its <label> stays programmatically associated.
                expect(input).not.toBeDisabled();
                expect(input).toHaveAttribute('readonly');
            }
        });

        it('TC-AB14: REMOVE FROM IMPORT is a keyboard-operable named button', async () => {
            const onRemove = vi.fn();
            const user = userEvent.setup();
            render(<QcSampleCard sample={makeSample()} onRemove={onRemove} />);

            const removeBtn = screen.getByRole('button', { name: /REMOVE FROM IMPORT/i });
            removeBtn.focus();
            expect(removeBtn).toHaveFocus();

            await user.keyboard('{Enter}');
            expect(onRemove).toHaveBeenCalledWith('omer2_5');
        });
    });
});
