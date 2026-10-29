import { describe, it, expect } from 'vitest';
import { qcWarningLabel } from './qcWarnings';

describe('qcWarningLabel', () => {
    it.each([
        [{ code: 'samples_not_backed_up', nb_samples: 3 }, '3 samples imported without raw backup'],
        [{ code: 'samples_without_ctd', nb_samples: 1 }, 'Missing 1 CTD file'],
        [{ code: 'coordinates_mismatches', nb_samples: 2 }, 'Mismatch 2 samples GPS coordinates'],
        [{ code: 'samples_on_land', nb_samples: 1 }, '1 sample on land'],
        [{ code: 'instrument_parameter_mismatches', nb_samples: 4 }, 'Mismatch in instrument parameters (4 samples)'],
        [{ code: 'suspicious_dates', nb_samples: 1 }, 'Suspicious time range (1 sample)'],
        [{ code: 'suspicious_pressures', nb_samples: 5 }, 'Suspicious pressure range (5 samples)'],
        [{ code: 'samples_not_imported_in_ecotaxa', nb_samples: 6 }, '6 samples not imported in EcoTaxa'],
        [{ code: 'classification_uncompleted', nb_samples: null }, 'Classification uncompleted'],
    ] as const)('words %j as on the STATS tab', (warning, label) => {
        expect(qcWarningLabel(warning)).toBe(label);
    });
});
