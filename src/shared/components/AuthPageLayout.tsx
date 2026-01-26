import { ReactNode } from "react";
import { Container, Box, Typography, Alert, ContainerProps } from "@mui/material";
import MainLayout from "@/app/layouts/MainLayout";

interface AuthPageLayoutProps {
    title: string;
    children?: ReactNode;
    error?: string | null;
    successMessage?: string | null;
    // Allows customization of container width (e.g., 'sm' for login, 'md' for register)
    maxWidth?: ContainerProps["maxWidth"];
}

/**
 * Standard Layout for all Authentication pages.
 * Handles Logo, Title, Error/Success Alerts, and Container sizing.
 */
export const AuthPageLayout = ({
    title,
    children,
    error,
    successMessage,
    maxWidth = "sm",
}: AuthPageLayoutProps) => {
    return (
        <MainLayout>
            <Container maxWidth={maxWidth} sx={{ mt: 12, textAlign: "left" }}>
                {/* Centralized Logo */}
                <Box
                    component="img"
                    src="/logo_ecopart.png"
                    alt="EcoPart"
                    sx={{ height: 48, mb: 2 }}
                />

                <Typography variant="h5" gutterBottom sx={{ mb: 4 }}>
                    {title}
                </Typography>

                {/* Display Success Message if present */}
                {successMessage && (
                    <Alert severity="success" sx={{ width: "100%", mb: 2 }}>
                        {successMessage}
                    </Alert>
                )}

                {/* Display Error Message if present */}
                {error && (
                    <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {children}
            </Container>
        </MainLayout>
    );
};