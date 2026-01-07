import { useEffect } from "react";
import { useAuthStore } from "@/features/auth";
import { fetchMe } from "@/features/auth/api/auth.api";

export default function AuthBootstrap() {
    const setUser = useAuthStore((s) => s.setUser);
    const clearUser = useAuthStore((s) => s.clearUser);

    useEffect(() => {
        fetchMe()
            .then(setUser)
            .catch(() => {
                clearUser();
            });

    }, [setUser, clearUser]);

    return null;
}
