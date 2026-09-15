import { useQuery } from "@tanstack/react-query";

import { getInstrumentModels, getOrganisations, getShips } from "./referenceData.api";
import { getEcoTaxaAccounts, getEcoTaxaInstances } from "./ecotaxa.api";

/**
 * Reference lists change rarely: keep them fresh for a while so the sections
 * that need them (new project, project metadata tab, register, profile…) share
 * one request instead of refetching on every mount.
 */
const REFERENCE_STALE_MS = 5 * 60 * 1000;

export const REFERENCE_QUERY_KEYS = {
    ships: ["reference", "ships"] as const,
    instrumentModels: ["reference", "instrument-models"] as const,
    organisations: ["reference", "organisations"] as const,
    ecoTaxaInstances: ["reference", "ecotaxa-instances"] as const,
    ecoTaxaAccounts: (userId: number | null | undefined) => ["ecotaxa-accounts", userId ?? null] as const,
};

/** Ship names (deduplicated), for the ship Autocomplete. */
export function useShips() {
    return useQuery({ queryKey: REFERENCE_QUERY_KEYS.ships, queryFn: getShips, staleTime: REFERENCE_STALE_MS });
}

/** Instrument models, for the instrument select. */
export function useInstrumentModels() {
    return useQuery({
        queryKey: REFERENCE_QUERY_KEYS.instrumentModels,
        queryFn: getInstrumentModels,
        staleTime: REFERENCE_STALE_MS,
    });
}

/** Organisation names, for the organisation Autocomplete (register, profile, admin user creation). */
export function useOrganisations() {
    return useQuery({
        queryKey: REFERENCE_QUERY_KEYS.organisations,
        queryFn: getOrganisations,
        staleTime: REFERENCE_STALE_MS,
    });
}

/** The EcoTaxa instances known to the backend. */
export function useEcoTaxaInstances() {
    return useQuery({
        queryKey: REFERENCE_QUERY_KEYS.ecoTaxaInstances,
        queryFn: getEcoTaxaInstances,
        staleTime: REFERENCE_STALE_MS,
    });
}

/** The EcoTaxa accounts a user has linked; held while the user id is unknown. */
export function useEcoTaxaAccounts(userId: number | null | undefined) {
    return useQuery({
        queryKey: REFERENCE_QUERY_KEYS.ecoTaxaAccounts(userId),
        queryFn: () => getEcoTaxaAccounts(userId as number),
        enabled: userId != null,
        // Linking / unlinking on the profile page invalidates this key; 30 s covers
        // navigating between the form sections that read it.
        staleTime: 30_000,
    });
}
