import { useCallback } from "react";

import { useServerTable } from "@/shared/hooks/useServerTable";
import { countProjectsForUser, type SearchFilter } from "@/features/projects/api/projects.api";
import { type AdminUser, deleteUser, searchUsers, setUserAdmin } from "../api/adminUsers.api";

// Stable default so callers that pass no extra filters don't get a fresh array
// reference every render (which would make the query key unstable → refetch loop).
const NO_EXTRA_FILTERS: SearchFilter[] = [];

/** React Query key of the admin user lists; invalidate it to refresh them. */
export const ADMIN_USERS_QUERY_KEY = ["admin", "users"] as const;

/**
 * Per-user manager / member project counts are not part of the user model, so
 * they are derived client-side: one projects search per user and per role,
 * reading only `search_info.total`. A failed lookup leaves the counts undefined
 * (rendered as "—").
 *
 * NOTE: this is a 2N the backend should eventually fold into the user search
 * response; keep page sizes reasonable until it does.
 */
async function enrichUsersWithProjectCounts(users: AdminUser[]): Promise<AdminUser[]> {
    const results = await Promise.allSettled(
        users.map(async (user) => {
            const [managerCount, memberCount] = await Promise.all([
                countProjectsForUser(user.user_id, "managers"),
                countProjectsForUser(user.user_id, "members"),
            ]);
            return { managerCount, memberCount };
        }),
    );

    return users.map((user, index) => {
        const result = results[index];
        if (result.status !== "fulfilled") {
            console.warn(`[Admin Users] Failed to load project counts for user ${user.user_id}`, result.reason);
            return user;
        }
        return { ...user, manager_count: result.value.managerCount, member_count: result.value.memberCount };
    });
}

/**
 * Hook backing the admin USERS tab: server-side pagination + debounced
 * attribute search against POST /users/searches, checkbox selection, and the
 * bulk actions `handleSetAdmin` (grant/revoke admin) and `handleDeleteUsers`.
 *
 * `extraFilters` are merged into every request on top of the attribute search —
 * used to pre-scope the list to a set of user ids (`user_id IN [...]`) when opened
 * from the PROJECTS tab (the members + managers of the selected project(s)). The
 * user search has no project filter, so the caller resolves it to user ids first.
 * Callers must memoize the array so it stays referentially stable across renders.
 */
export const useAdminUsersTable = (extraFilters: SearchFilter[] = NO_EXTRA_FILTERS) => {
    const table = useServerTable<AdminUser>({
        queryKey: [...ADMIN_USERS_QUERY_KEY],
        fetchPage: async ({ page, limit, filters }) => {
            const response = await searchUsers({ page, limit, filters, sort_by: "desc(user_id)" });
            return { rows: response.users ?? [], total: response.search_info?.total ?? 0 };
        },
        // last_name (Name), email, organisation and country are LIKE attributes;
        // user_id is an exact numeric match.
        defaultAttribute: "last_name",
        numericAttributes: ["user_id"],
        extraFilters,
        enrich: enrichUsersWithProjectCounts,
    });

    const { runBulkAction, selectedIds } = table;

    /** Grant (makeAdmin=true) or revoke (false) admin rights on the selection. */
    const handleSetAdmin = useCallback((makeAdmin: boolean) => runBulkAction({
        action: (userId) => setUserAdmin(userId, makeAdmin),
        confirm: {
            title: makeAdmin ? "Grant admin rights" : "Revoke admin rights",
            message: makeAdmin
                ? `${selectedIds.length} user(s) will get full administrator access: manage all users, projects and tasks.`
                : `${selectedIds.length} user(s) will lose administrator access.`,
            confirmLabel: makeAdmin ? "Grant" : "Revoke",
            severity: "warning",
        },
        successMessage: makeAdmin ? "Admin rights granted." : "Admin rights revoked.",
        failureMessage: "Failed to update some users.",
    }), [runBulkAction, selectedIds.length]);

    /** Delete (deactivate) every user in the current selection, after confirmation. */
    const handleDeleteUsers = useCallback(() => runBulkAction({
        action: deleteUser,
        confirm: {
            title: "Delete user accounts",
            message: `${selectedIds.length} account(s) will be deactivated and can no longer sign in.`,
            confirmLabel: "Delete",
        },
        successMessage: "User account(s) deleted.",
        failureMessage: "Failed to delete some users.",
    }), [runBulkAction, selectedIds.length]);

    return {
        users: table.rows,
        loading: table.loading,
        totalRows: table.totalRows,
        error: table.error,
        paginationModel: table.paginationModel,
        setPaginationModel: table.setPaginationModel,
        selectedUsers: table.selectionModel,
        setSelectedUsers: table.setSelectionModel,
        selectedUserIds: table.selectedIds,
        selectionCount: table.selectionCount,
        searchText: table.searchText,
        setSearchText: table.setSearchText,
        searchAttribute: table.searchAttribute,
        setSearchAttribute: table.setSearchAttribute,
        isActionRunning: table.isActionRunning,
        handleSetAdmin,
        handleDeleteUsers,
        refetchUsers: table.refetch,
        showSnackbar: table.showSnackbar,
        snackbar: table.snackbar,
        closeSnackbar: table.closeSnackbar,
    };
};
