import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";

import { ProtectedRoute } from "@/app/ProtectedRoute";
import { PublicOnlyRoute } from "@/app/PublicOnlyRoute";
import AdminRoute from "@/app/AdminRoute";
import { RouteErrorPage } from "@/app/RouteErrorPage";
import { PageFallback } from "@/app/PageFallback";
import MainLayout from "@/app/layouts/MainLayout";

// Every page is its own chunk, loaded on first navigation, so the initial bundle
// only carries the shell (router, theme, auth bootstrap) instead of every screen.
const HomePage = lazy(() => import("@/features/home/pages/HomePage"));
const AboutPage = lazy(() => import("@/features/about/pages/AboutPage"));
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
const ResetPasswordPage = lazy(() => import("@/features/auth/pages/ResetPasswordPage"));
const ResetPasswordConfirmPage = lazy(() => import("@/features/auth/pages/ResetPasswordConfirmPage"));
const ValidateEmailPage = lazy(() => import("@/features/auth/pages/ValidateEmailPage"));
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const ProfilePage = lazy(() => import("@/features/userProfile/pages/ProfilePage"));
const ProjectsPage = lazy(() => import("@/features/projects/pages/ProjectsPage"));
const NewProjectPage = lazy(() => import("@/features/projects/pages/NewProjectPage"));
const ProjectDetailsPage = lazy(() => import("@/features/projects/pages/ProjectDetailsPage"));
const TaskDetailsPage = lazy(() => import("@/features/projects/pages/TaskDetailsPage"));
const TasksPage = lazy(() => import("@/features/projects/pages/TasksPage"));
const AdminPage = lazy(() => import("@/features/admin/pages/AdminPage"));
const NotFoundPage = lazy(() => import("@/features/errors/pages/NotFoundPage"));
const ComingSoonPage = lazy(() => import("@/features/errors/pages/ComingSoonPage"));

/** Wraps a lazily-loaded page in the suspense fallback shown while its chunk downloads. */
const page = (element: ReactNode) => <Suspense fallback={<PageFallback />}>{element}</Suspense>;

const protectedPage = (element: ReactNode) => page(<ProtectedRoute>{element}</ProtectedRoute>);

export const router = createBrowserRouter([
    {
        // Pathless layout route: every page renders inside the app chrome (header +
        // announcement banner) through MainLayout's <Outlet />, and a render error
        // anywhere below lands on the in-app error page instead of React Router's
        // default stack trace.
        element: <MainLayout />,
        errorElement: <RouteErrorPage />,
        children: [
            { path: "/", element: page(<HomePage />) },
            { path: "/about", element: page(<AboutPage />) },
            {
                path: "/login",
                element: page(
                    <PublicOnlyRoute>
                        <LoginPage />
                    </PublicOnlyRoute>
                ),
            },
            { path: "/dashboard", element: protectedPage(<DashboardPage />) },
            { path: "/reset-password", element: page(<ResetPasswordPage />) },
            { path: "/reset-password/:token", element: page(<ResetPasswordConfirmPage />) },
            {
                path: "/register",
                element: page(
                    <PublicOnlyRoute>
                        <RegisterPage />
                    </PublicOnlyRoute>
                ),
            },
            { path: "/users/:user_id/welcome/:token", element: page(<ValidateEmailPage />) },
            {
                // Canonical form is /settings/:userId/:tabName. The legacy /settings/:tabName
                // (no id) is still accepted — ProfilePage disambiguates a numeric first
                // segment (a user id) from a tab slug and defaults to the logged-in user.
                path: "/settings/:userId?/:tabName?",
                element: protectedPage(<ProfilePage />),
            },
            { path: "/projects", element: protectedPage(<ProjectsPage />) },
            { path: "/new-project", element: protectedPage(<NewProjectPage />) },
            { path: "/projects/:id/:tabName?", element: protectedPage(<ProjectDetailsPage />) },
            { path: "/projects/:id/tasks/:taskId/:tabName?", element: protectedPage(<TaskDetailsPage />) },
            { path: "/tasks", element: protectedPage(<TasksPage />) },
            {
                // Global task detail (opened from the /tasks list, no project context).
                path: "/tasks/:taskId/:tabName?",
                element: protectedPage(<TaskDetailsPage />),
            },
            {
                path: "/admin/:tabName?",
                element: page(
                    <AdminRoute>
                        <AdminPage />
                    </AdminRoute>
                ),
            },
            // Header entry whose feature is not built yet.
            {
                path: "/explore",
                element: page(
                    <ComingSoonPage
                        title="Explore"
                        description="Browse and visualise particle data across projects. This section is coming soon."
                    />
                ),
            },
            { path: "*", element: page(<NotFoundPage />) },
        ],
    },
]);
