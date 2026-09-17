import { useEffect, useRef } from "react";
import { useAuthStore } from "@/features/auth";
import { fetchMe } from "@/features/auth/api/auth.api";
import { setSessionExpiredHandler } from "@/shared/api/http";
import { queryClient } from "@/shared/api/queryClient";

export default function AuthBootstrap() {
    const setUser = useAuthStore((s) => s.setUser);
    const clearUser = useAuthStore((s) => s.clearUser);
    const finishAuthLoading = useAuthStore((s) => s.finishAuthLoading);
    const userId = useAuthStore((s) => s.user?.user_id ?? null);

    // The React Query cache is per browser tab, not per account: whenever the
    // signed-in user changes (login, logout, session expiry, account deletion)
    // drop it entirely, so the next user never sees the previous one's cached
    // projects, tasks or accounts without an authorized request of their own.
    const previousUserId = useRef(userId);
    useEffect(() => {
        if (previousUserId.current === userId) return;
        previousUserId.current = userId;
        queryClient.clear();
    }, [userId]);

    // When the refresh token is rejected the session is over: drop the user —
    // ProtectedRoute then redirects to /login and the effect above clears the cache.
    useEffect(() => {
        setSessionExpiredHandler(() => clearUser());
        return () => setSessionExpiredHandler(null);
    }, [clearUser]);

    useEffect(() => {
        fetchMe()
            .then(setUser)
            .catch(() => {
                clearUser();
            })
            .finally(() => {
                finishAuthLoading();
            });
    }, [setUser, clearUser, finishAuthLoading]);

    return null;
}
