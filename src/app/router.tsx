import { createBrowserRouter } from "react-router-dom";

import { ProtectedRoute } from "@/app/ProtectedRoute";
import { LoginPage } from "@/features/auth";
import { DashboardPage } from "@/features/dashboard";

export const router = createBrowserRouter([
    { path: "/login", element: <LoginPage /> },
    {
        path: "/",
        element: (
            <ProtectedRoute>
                <DashboardPage />
            </ProtectedRoute>
        ),
    },
]);
