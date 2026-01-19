import { createBrowserRouter } from "react-router-dom";

import { ProtectedRoute } from "@/app/ProtectedRoute";
import { HomePage } from "@/features/home";
import { LoginPage, RegisterPage, ResetPasswordPage, ResetPasswordConfirmPage } from "@/features/auth";
import { DashboardPage } from "@/features/dashboard";
import { NotFoundPage } from "@/features/errors";

export const router = createBrowserRouter([
    { path: "/", element: <HomePage /> },
    { path: "/login", element: <LoginPage /> },
    {
        path: "/dashboard",
        element: (
            <ProtectedRoute>
                <DashboardPage />
            </ProtectedRoute>
        ),
    },
    {
        path: "/reset-password",
        element: <ResetPasswordPage />,
    },
    {
        path: "/reset-password/:token",
        element: <ResetPasswordConfirmPage />,
    },
    {
        path: "/register",
        element: <RegisterPage />,
    },

    // {
    //     path: "/admin",
    //     element: (
    //         <AdminRoute>
    //             <AdminPage />
    //         </AdminRoute>
    //     ),
    // },
    { path: "*", element: <NotFoundPage /> },
]);
