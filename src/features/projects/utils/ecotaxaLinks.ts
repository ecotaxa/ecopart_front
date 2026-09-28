/**
 * EcoTaxa URL of a project's classification page with the sample filter set, so
 * the user lands on the objects of that one sample. Returns null while any part
 * is unknown (project not linked, instance not resolved, sample not imported).
 */
export function buildEcoTaxaSampleUrl(
    instanceUrl: string | null | undefined,
    ecoTaxaProjectId: number | null | undefined,
    ecoTaxaSampleId: number | null | undefined,
): string | null {
    if (!instanceUrl || ecoTaxaProjectId == null || ecoTaxaSampleId == null) return null;
    const base = instanceUrl.replace(/\/+$/, "");
    return `${base}/prj/${ecoTaxaProjectId}?samples=${ecoTaxaSampleId}`;
}
