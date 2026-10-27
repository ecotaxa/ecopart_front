import type { ExploreMode, ExploreProjectRow } from "../types/explore.types";

const MODE_WORDS: Record<ExploreMode, string> = {
    depth: "depth profiles",
    time: "time series",
    all: "depth profiles and time series",
};

/** Who receives the data request of a project: its managers, else its contact. */
export function accessRequestRecipients(project: ExploreProjectRow): string[] {
    const emails = project.managers.map((manager) => manager.email);
    if (emails.length === 0 && project.contact) emails.push(project.contact.email);
    return [...new Set(emails.map((email) => email.trim()).filter(Boolean))];
}

/**
 * `mailto:` link asking the managers of a project for its data, with a pre-written
 * message. A stop-gap: the request will be sent by the backend once its endpoint exists.
 */
export function buildAccessRequestMailto(
    project: ExploreProjectRow,
    mode: ExploreMode,
    requester: { first_name: string; last_name: string } | null,
): string | null {
    const recipients = accessRequestRecipients(project);
    if (recipients.length === 0) return null;

    const subject = `[EcoPart] Data request: ${project.project_title} [${project.project_id}]`;
    const body = [
        "Hello,",
        "",
        `I found the project "${project.project_title}" [${project.project_id}] while exploring the EcoPart data`
        + ` (${MODE_WORDS[mode]}): ${project.nb_selected_samples} of its`
        + ` ${project.nb_samples} samples match my selection.`,
        "",
        "Would you agree to share these data with me? Please let me know the conditions of use.",
        "",
        "Best regards,",
        requester ? `${requester.first_name} ${requester.last_name}` : "",
    ].join("\n");

    const query = new URLSearchParams({ subject, body }).toString().replace(/\+/g, "%20");
    return `mailto:${recipients.join(",")}?${query}`;
}
