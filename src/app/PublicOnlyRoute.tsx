import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuthStore } from "@/features/auth";

type Props = {
    children: ReactNode;
};

export function PublicOnlyRoute({ children }: Props) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}