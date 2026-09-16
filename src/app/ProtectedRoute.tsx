import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "@/features/auth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const location = useLocation();

    if (!isAuthenticated) {
        // Remember where the user was heading (e.g. a project link received by
        // email) so the login page can send them back there afterwards.
        return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
    }

    return children;
}
