import type { User } from "@/features/auth/types/user";
import type { MinimalUserModel, Project, SearchFilter } from "../api/projects.api";

/**
 * Access control on project data, mirroring the backend policy (ecopart_back
 * `project-access.ts`). What a user may do on a project depends on their role on
 * it and on the project's privacy status. Admins and managers can do everything,
 * members everything but manage; a user without privilege gets more as the
 * project opens up:
 *
 *   privacy  | see | figures | export_particles | export_ecotaxa | import | manage
 *   private  |  V  |    X    |        X         |       X        |   X    |   X
 *   visible  |  V  |    V    |        X         |       X        |   X    |   X
 *   public   |  V  |    V    |        V         |       X        |   X    |   X
 *   open     |  V  |    V    |        V         |       V        |   X    |   X
 *
 * The backend enforces it; the UI only hides what would be refused.
 */

export type ProjectRole = "admin" | "manager" | "member" | "user";

export type ProjectPrivacyStatus = "private" | "visible" | "public" | "open";

export type ProjectAction =
    | "see"               // project metadata and stats
    | "figures"           // sample list, sample details, QC graphs
    | "export_particles"  // binned export
    | "export_ecotaxa"    // EcoTaxa classification export
    | "import"            // import, QC validation, coordinates, backup, tasks, EcoTaxa and CTD lists
    | "manage";           // edit metadata and privileges, EcoTaxa link, delete

export const PROJECT_ACTIONS: readonly ProjectAction[] = ["see", "figures", "export_particles", "export_ecotaxa", "import", "manage"];

export const PROJECT_PRIVACY_STATUSES: readonly ProjectPrivacyStatus[] = ["private", "visible", "public", "open"];

export interface ProjectAccess {
    role: ProjectRole;
    privacy: ProjectPrivacyStatus;
    can: Record<ProjectAction, boolean>;
}

type ProjectPrivileges = Pick<Project, "managers" | "members">;
type AccessUser = Pick<User, "user_id" | "is_admin">;

const PRIVACY_LABELS: Record<ProjectPrivacyStatus, string> = {
    private: "Private",
    visible: "Visible",
    public: "Public",
    open: "Open",
};

const ROLE_LABELS: Record<ProjectRole, string | null> = {
    admin: "Admin",
    manager: "Manager",
    member: "Member",
    user: null,
};

const holdsUser = (users: MinimalUserModel[] | undefined, userId: number): boolean =>
    (users ?? []).some((candidate) => Number(candidate.user_id) === userId);

/** admin > manager > member > user; no logged-in user is a plain user. */
export function getProjectRole(project: ProjectPrivileges | null | undefined, user: AccessUser | null | undefined): ProjectRole {
    if (!user) return "user";
    if (user.is_admin === true) return "admin";
    const userId = Number(user.user_id);
    if (holdsUser(project?.managers, userId)) return "manager";
    if (holdsUser(project?.members, userId)) return "member";
    return "user";
}

export function isProjectActionAllowed(role: ProjectRole, privacy: ProjectPrivacyStatus, action: ProjectAction): boolean {
    if (role === "admin" || role === "manager") return true;
    if (role === "member") return action !== "manage";
    switch (action) {
        case "see": return true;
        case "figures": return privacy !== "private";
        case "export_particles": return privacy === "public" || privacy === "open";
        case "export_ecotaxa": return privacy === "open";
        case "import":
        case "manage": return false;
    }
}

/** The privacy status of a payload; anything missing or unknown reads as private (an old backend fails closed). */
export const toPrivacyStatus = (value: unknown): ProjectPrivacyStatus =>
    PROJECT_PRIVACY_STATUSES.find((status) => status === value) ?? "private";

export const privacyLabel = (status: ProjectPrivacyStatus): string => PRIVACY_LABELS[status];

/** The privacy choice of a project list: one status, or "any" for no filter. */
export type PrivacyFilterValue = ProjectPrivacyStatus | "any";

/** The backend resolves privacy_status to the projects at that status today. */
export const privacySearchFilters = (value: PrivacyFilterValue): SearchFilter[] =>
    value === "any" ? [] : [{ field: "privacy_status", operator: "=", value }];

/** The Privilege chip label of a role; null for a user without privilege. */
export const roleLabel = (role: ProjectRole): string | null => ROLE_LABELS[role];

export function getProjectAccess(
    project: (ProjectPrivileges & Pick<Project, "privacy_status">) | null | undefined,
    user: AccessUser | null | undefined,
): ProjectAccess {
    const role = getProjectRole(project, user);
    const privacy = toPrivacyStatus(project?.privacy_status);
    const can = Object.fromEntries(
        PROJECT_ACTIONS.map((action) => [action, isProjectActionAllowed(role, privacy, action)]),
    ) as Record<ProjectAction, boolean>;
    return { role, privacy, can };
}
