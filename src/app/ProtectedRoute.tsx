import { Navigate } from "react-router-dom";
import { ReactNode } from "react";

import { useAuthStore } from "@/features/auth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
