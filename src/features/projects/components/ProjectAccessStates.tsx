import { Alert, AlertTitle, Link } from "@mui/material";

import { isAccessDenied, isNotFound } from "@/shared/api/http";
import type { MinimalUserModel, Project } from "../api/projects.api";

/** A privilege holder as a person: the backend may send "undefined undefined" as the name of an account without one. */
const personLabel = (user: MinimalUserModel): string =>
    user.user_name?.replace(/\b(?:undefined|null)\b/g, "").trim() || user.email || `user #${user.user_id}`;

function AccessContact({ project }: { project: Pick<Project, "contact" | "managers"> }) {
    const contact = project.contact;
    if (contact?.user_id != null) {
        return (
            <>
                To request access, contact {personLabel(contact)}
                {contact.email && <> (<Link href={`mailto:${contact.email}`}>{contact.email}</Link>)</>}.
            </>
        );
    }
    const managers = (project.managers ?? []).map(personLabel);
    return managers.length > 0
        ? <>To request access, contact a project manager: {managers.join(", ")}.</>
        : <>To request access, contact the project managers.</>;
}

/** Shown to a user without privilege while the project is private: its samples and figures are not served yet. */
export function ProjectPrivacyNotice({ project }: { project: Pick<Project, "contact" | "managers"> }) {
    return (
        <Alert severity="info">
            <AlertTitle>Data hidden until the project becomes visible</AlertTitle>
            This project is private: its samples and figures are only shown to its members for now.{" "}
            <AccessContact project={project} />
        </Alert>
    );
}

/** Why a project could not be loaded: not found, no access, or anything else. */
export function ProjectLoadError({ error }: { error: unknown }) {
    if (isNotFound(error)) {
        return (
            <Alert severity="warning">
                <AlertTitle>Project not found</AlertTitle>
                This project does not exist or has been deleted.
            </Alert>
        );
    }
    if (isAccessDenied(error)) {
        return (
            <Alert severity="error">
                <AlertTitle>No access to this project</AlertTitle>
                Your account is not allowed to see this project.
            </Alert>
        );
    }
    return (
        <Alert severity="error">
            Failed to load project details.{error instanceof Error && error.message ? ` (${error.message})` : ""}
        </Alert>
    );
}
