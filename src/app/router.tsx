import { createBrowserRouter } from "react-router-dom";

import { ProtectedRoute } from "@/app/ProtectedRoute";
import { HomePage } from "@/features/home";
import { LoginPage } from "@/features/auth";
import { DashboardPage } from "@/features/dashboard";
import { NotFoundPage } from "@/features/errors";
// import AdminRoute from "./AdminRoute"; TO ENABLE LATER
// import { AdminPage } from "@/features/admin"; TO ENABLE LATER

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
