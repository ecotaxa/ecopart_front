import { safeHttpUrl } from "@/shared/utils/safeHttpUrl";

/**
 * EcoTaxa URL of a project, on the URL stored for its instance. Returns null while
 * any part is unknown (project not linked, instance not resolved) or when the
 * stored URL is not http(s).
 */
export function buildEcoTaxaProjectUrl(
    instanceUrl: string | null | undefined,
    ecoTaxaProjectId: number | null | undefined,
): string | null {
    const base = safeHttpUrl(instanceUrl)?.replace(/\/+$/, "");
    if (!base || ecoTaxaProjectId == null) return null;
    return `${base}/prj/${ecoTaxaProjectId}`;
}

/**
 * EcoTaxa URL of a project's classification page with the sample filter set, so
 * the user lands on the objects of that one sample. Returns null while any part
 * is unknown (same as above, or sample not imported).
 */
export function buildEcoTaxaSampleUrl(
    instanceUrl: string | null | undefined,
    ecoTaxaProjectId: number | null | undefined,
    ecoTaxaSampleId: number | null | undefined,
): string | null {
    const projectUrl = buildEcoTaxaProjectUrl(instanceUrl, ecoTaxaProjectId);
    if (!projectUrl || ecoTaxaSampleId == null) return null;
    return `${projectUrl}?samples=${ecoTaxaSampleId}`;
}
