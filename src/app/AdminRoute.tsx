import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth";

type Props = {
    children: ReactNode;
};

export default function AdminRoute({ children }: Props) {
    const { isAuthenticated, user } = useAuthStore();

    // Not logged in → login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Logged in but not admin → home
    if (!user?.is_admin) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
