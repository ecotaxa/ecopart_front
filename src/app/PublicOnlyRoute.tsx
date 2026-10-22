import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "@/features/auth";
import { redirectPathFromState } from "@/shared/utils/redirectPath";

type Props = {
    children: ReactNode;
};

export function PublicOnlyRoute({ children }: Props) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const location = useLocation();

    if (isAuthenticated) {
        // Honour the page a protected route sent the user away from: this guard
        // re-renders as soon as the login sets the user, before the login page's
        // own navigate() lands, so it must aim at the same place.
        return <Navigate to={redirectPathFromState(location.state)} replace />;
    }

    return <>{children}</>;
}
