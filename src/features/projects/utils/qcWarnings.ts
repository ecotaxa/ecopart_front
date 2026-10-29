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
        case "samples_on_land":
            return `${samples} on land`;
        case "instrument_parameter_mismatches":
            return `Mismatch in instrument parameters (${samples})`;
        case "object_size_mismatches":
            return `Mismatch instrument specification (${samples})`;
        case "suspicious_dates":
            return `Suspicious time range (${samples})`;
        case "time_span_over_a_year":
            return "Suspicious time range (project longer than a year)";
        case "suspicious_pressures":
            return `Suspicious pressure range (${samples})`;
        case "unfiltered_uvp5hd":
            return "Unfiltered UVP5HD project";
        case "ecotaxa_not_linked":
            return "Project not linked to an EcoTaxa project";
        case "samples_not_imported_in_ecotaxa":
            return `${samples} not imported in EcoTaxa`;
        case "classification_uncompleted":
            return "Classification uncompleted";
        default:
            return code;
    }
}
