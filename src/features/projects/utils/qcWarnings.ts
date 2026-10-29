import type { ProjectQcWarning } from "../api/projects.api";
import { pluralize } from "../components/stats/statsFormat";

/** A QC warning of the project lists, worded as on the STATS tab, with the samples it concerns. */
export function qcWarningLabel({ code, nb_samples }: ProjectQcWarning): string {
    const samples = pluralize(nb_samples ?? 0, "sample");
    switch (code) {
        case "samples_not_backed_up":
            return `${samples} imported without raw backup`;
        case "samples_without_ctd":
            return `Missing ${pluralize(nb_samples ?? 0, "CTD file")}`;
        case "coordinates_mismatches":
            return `Mismatch ${samples} GPS coordinates`;
        case "instrument_parameter_mismatches":
            return `Mismatch in instrument parameters (${samples})`;
        case "suspicious_dates":
            return `Suspicious time range (${samples})`;
        case "suspicious_pressures":
            return `Suspicious pressure range (${samples})`;
        case "samples_not_imported_in_ecotaxa":
            return `${samples} not imported in EcoTaxa`;
        case "classification_uncompleted":
            return "Classification uncompleted";
        default:
            return code;
    }
}
