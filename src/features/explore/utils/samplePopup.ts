import type { PopupLink } from "@/shared/components/PopupLinks";
import type { ExploreMapSample } from "../types/explore.types";
import { PRIVACY_LABELS } from "./exploreFilters";

/** What the popup of a sample shows, on the map and on the graphs. */
export interface SamplePopup {
    details: string[];
    links: PopupLink[];
}

/**
 * The project and the instrument of a sample, and links to its page and to its
 * project's. The sample page needs the figures of the project, refused on a private
 * project to a user without privilege on it (backend `ProjectAccessPolicy`): that
 * link is left out then. Both open in a new tab, as the project links of the
 * selection table do: the Explore selection lives in the state of the page only.
 */
export function samplePopup(sample: ExploreMapSample, isAdmin: boolean): SamplePopup {
    const projectPath = `/projects/${sample.project_id}`;
    const canOpenSample = isAdmin || sample.is_my_project || sample.privacy_status !== "private";
    return {
        details: [
            `${sample.project_title} [${sample.project_id}]`,
            `${sample.instrument_model} · ${PRIVACY_LABELS[sample.privacy_status]}`,
        ],
        links: [
            ...(canOpenSample ? [{ label: "Open sample", to: `${projectPath}/samples/${sample.sample_id}`, newTab: true }] : []),
            { label: "Open project", to: projectPath, newTab: true },
        ],
    };
}
