import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { EcoTaxaProjectPicker } from './EcoTaxaProjectPicker';
import { renderWithRouter } from '@/test/utils';
import { server } from '@/test/msw/server';

const project = (id: number, title: string, already_linked = false, instrument = 'UVP6') => ({
    ecotaxa_project_id: id,
    ecotaxa_project_title: title,
    ecotaxa_project_instrument: instrument,
    ecotaxa_project_object_count: 2500,
    ecotaxa_project_validated_pct: 12.4,
    already_linked,
});

// Holds the picked project and the instrument model as the project forms do, so a cleared project
// really leaves the field.
function PickerInForm({ initialValue = '', initialInstrument = '', onChange }: { initialValue?: string; initialInstrument?: string; onChange: (projectId: string) => void }) {
    const [value, setValue] = useState(initialValue);
    const [instrumentModel, setInstrumentModel] = useState(initialInstrument);
    return (
        <>
            <EcoTaxaProjectPicker
                userId={1}
                accountId="7"
                instrumentModel={instrumentModel}
                value={value}
                onChange={(projectId) => { onChange(projectId); setValue(projectId); }}
            />
            <button onClick={() => setInstrumentModel('UVP5HD')}>Switch to UVP5HD</button>
        </>
    );
}

describe('EcoTaxaProjectPicker', () => {
    it('lists the projects of the account for the instrument and filters on the ID', async () => {
        const user = userEvent.setup({ delay: null });
        let askedUrl = '';
        server.use(
            http.get('*/users/1/ecotaxa_account/7/projects', ({ request }) => {
                askedUrl = request.url;
                return HttpResponse.json([project(42, 'Tara UVP6'), project(10, 'Old cruise')]);
            }),
        );
        const onChange = vi.fn();

        renderWithRouter(<EcoTaxaProjectPicker userId={1} accountId="7" instrumentModel="UVP6LP" value="" onChange={onChange} />);

        const input = screen.getByRole('combobox', { name: /EcoTaxa project/i });
        await user.type(input, '42');
        expect(await screen.findByRole('option', { name: /Tara UVP6/i })).toHaveTextContent('#42 · UVP6 · 2,500 objects · 12% validated');
        expect(screen.queryByRole('option', { name: /Old cruise/i })).not.toBeInTheDocument();
        expect(new URL(askedUrl).searchParams.get('instrument_model')).toBe('UVP6LP');

        await user.click(screen.getByRole('option', { name: /Tara UVP6/i }));
        expect(onChange).toHaveBeenCalledWith('42');
    });

    it('drops a picked project the account does not offer and says so under the field', async () => {
        const user = userEvent.setup({ delay: null });
        server.use(
            http.get('*/users/1/ecotaxa_account/7/projects', () => HttpResponse.json([project(42, 'Tara UVP6')])),
        );
        const onChange = vi.fn();

        renderWithRouter(<PickerInForm initialValue="999" onChange={onChange} />);

        await waitFor(() => expect(onChange).toHaveBeenCalledWith(''));
        const warning = await screen.findByRole('alert');
        expect(warning).toHaveTextContent('EcoTaxa project #999 was unselected: it is not among the EcoTaxa projects this account can manage.');

        // The user can close it.
        await user.click(screen.getByRole('button', { name: /close/i }));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('drops the picked project when the instrument model no longer fits it, until another one is picked', async () => {
        const user = userEvent.setup({ delay: null });
        server.use(
            http.get('*/users/1/ecotaxa_account/7/projects', ({ request }) =>
                HttpResponse.json(new URL(request.url).searchParams.get('instrument_model') === 'UVP5HD'
                    ? [project(7, 'UVP5 cruise', false, 'UVP5HD')]
                    : [project(42, 'Tara UVP6')])),
        );
        const onChange = vi.fn();

        renderWithRouter(<PickerInForm initialInstrument="UVP6LP" onChange={onChange} />);

        const input = screen.getByRole('combobox', { name: /EcoTaxa project/i });
        await user.click(input);
        await user.click(await screen.findByRole('option', { name: /Tara UVP6/i }));
        expect(input).toHaveValue('Tara UVP6 (#42)');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Switch to UVP5HD' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            '"Tara UVP6 (#42)" was unselected: it is a UVP6 EcoTaxa project, which does not fit the instrument model UVP5HD. Pick an EcoTaxa project that fits it.'
        );
        expect(onChange).toHaveBeenLastCalledWith('');
        expect(input).toHaveValue('');

        await user.click(input);
        await user.click(await screen.findByRole('option', { name: /UVP5 cruise/i }));
        expect(onChange).toHaveBeenLastCalledWith('7');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('asks to log in again when the EcoTaxa session has expired', async () => {
        server.use(
            http.get('*/users/1/ecotaxa_account/7/projects', () =>
                HttpResponse.json({ errors: ['Ecotaxa account session expired'] }, { status: 409 })),
        );

        renderWithRouter(<EcoTaxaProjectPicker userId={1} accountId="7" instrumentModel="" value="" onChange={vi.fn()} />);

        expect(await screen.findByText(/session on this EcoTaxa account has expired/i)).toBeInTheDocument();
    });

    it('falls back to typing the ID when the list cannot be loaded', async () => {
        const user = userEvent.setup({ delay: null });
        server.use(
            http.get('*/users/1/ecotaxa_account/7/projects', () =>
                HttpResponse.json({ errors: ['Cannot list EcoTaxa projects'] }, { status: 500 })),
        );
        const onChange = vi.fn();

        renderWithRouter(<EcoTaxaProjectPicker userId={1} accountId="7" instrumentModel="" value="" onChange={onChange} />);

        const input = await screen.findByRole('textbox', { name: /EcoTaxa project ID/i });
        expect(screen.getByText(/could not be loaded: enter the project ID/i)).toBeInTheDocument();
        await user.type(input, '5');
        expect(onChange).toHaveBeenCalledWith('5');
    });
});
