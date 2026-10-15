import { useMemo } from "react";

import { useAuthStore } from "@/features/auth/store/auth.store";
import type { Project } from "../api/projects.api";
import { getProjectAccess, type ProjectAccess } from "../utils/projectAccess";

/**
 * What the logged-in user may do on `project` (see `projectAccess`). While the
 * project is unknown only an admin gets more than "see".
 */
export function useProjectAccess(project: Project | null | undefined): ProjectAccess {
    const user = useAuthStore((state) => state.user);
    return useMemo(() => getProjectAccess(project, user), [project, user]);
}
