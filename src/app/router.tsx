import { createBrowserRouter } from "react-router-dom";

import { ProtectedRoute } from "@/app/ProtectedRoute";
import { PublicOnlyRoute } from "@/app/PublicOnlyRoute";
import { HomePage } from "@/features/home";
import { LoginPage, RegisterPage, ResetPasswordPage, ResetPasswordConfirmPage, ValidateEmailPage } from "@/features/auth";
import { DashboardPage } from "@/features/dashboard";
import { NotFoundPage } from "@/features/errors";
import { ProfilePage } from "@/features/userProfile";
import ProjectsPage from "@/features/projects/pages/ProjectsPage";
import NewProjectPage from "@/features/projects/pages/NewProjectPage";
import ProjectDetailsPage from "@/features/projects/pages/ProjectDetailsPage";

export const router = createBrowserRouter([
    { path: "/", element: <HomePage /> },
    {
        path: "/login",
        element: (
            <PublicOnlyRoute>
                <LoginPage />
            </PublicOnlyRoute>
        ),
    },
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
        element: (
            <PublicOnlyRoute>
                <RegisterPage />
            </PublicOnlyRoute>
        ),
    },
    {
        path: "/users/:user_id/welcome/:token",
        element: <ValidateEmailPage />,
    },
    {
        path: "/settings",
        element: (
            <ProtectedRoute>
                <ProfilePage />
            </ProtectedRoute>
        ),
    },
    {
        path: "/projects",
        element: (
            <ProtectedRoute>
                <ProjectsPage />
            </ProtectedRoute>
        ),
    },
    {
        path: "/new-project",
        element: (
            <ProtectedRoute>
                <NewProjectPage />
            </ProtectedRoute>
        ),
    },

    {
        path: "/projects/:id/:tabName?",
        element: (
            <ProtectedRoute>
                <ProjectDetailsPage />
            </ProtectedRoute>
        ),
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
