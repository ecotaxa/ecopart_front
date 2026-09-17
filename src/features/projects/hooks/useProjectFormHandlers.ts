import { useMemo } from "react";

import type { NewProjectFormValues } from "../types/newProject.types";

/** The `updateField` signature shared by the New Project form and the Metadata tab hooks. */
export type UpdateProjectField = <T extends keyof NewProjectFormValues>(
    section: T,
    data: Partial<NewProjectFormValues[T]> | NewProjectFormValues[T],
) => void;

/**
 * One stable `onChange` callback per form section, derived once from a stable
 * `updateField`. Passing these (instead of inline arrows) lets the memoized
 * sections skip re-rendering while the user types in another section.
 */
export function useProjectFormHandlers(updateField: UpdateProjectField) {
    return useMemo(() => ({
        rootFolderPath: (value: string) => updateField("rootFolderPath", value),
        instrument: (data: Partial<NewProjectFormValues["instrument"]>) => updateField("instrument", data),
        metadata: (data: Partial<NewProjectFormValues["metadata"]>) => updateField("metadata", data),
        people: (data: Partial<NewProjectFormValues["people"]>) => updateField("people", data),
        importSettings: (data: Partial<NewProjectFormValues["importSettings"]>) => updateField("importSettings", data),
        ecoTaxa: (data: Partial<NewProjectFormValues["ecoTaxa"]>) => updateField("ecoTaxa", data),
        privileges: (data: NewProjectFormValues["privileges"]) => updateField("privileges", data),
        privacy: (data: Partial<NewProjectFormValues["privacy"]>) => updateField("privacy", data),
    }), [updateField]);
}
