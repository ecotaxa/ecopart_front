import { Box, Button, Container, Typography } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";

import MainLayout from "@/app/layouts/MainLayout";

/**
 * Error boundary for the whole route tree (`errorElement` on the root route).
 * A render error or a failed lazy chunk shows this page instead of React
 * Router's default stack-trace screen.
 */
export function RouteErrorPage() {
    const error = useRouteError();
    const navigate = useNavigate();

    const message = isRouteErrorResponse(error)
        ? `${error.status} ${error.statusText}`
        : error instanceof Error
            ? error.message
            : "An unexpected error occurred.";

    console.error("[Router] Unhandled route error:", error);

    return (
        <MainLayout>
            <Container maxWidth="sm" sx={{ mt: 10, mb: 8, textAlign: "center" }}>
                <Box sx={{ color: "error.main", mb: 2 }}>
                    <ErrorOutlineIcon sx={{ fontSize: 56 }} />
                </Box>
                <Typography variant="h4" gutterBottom>
                    Something went wrong
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    {message}
                </Typography>
                <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
                    <Button variant="outlined" onClick={() => window.location.reload()}>
                        Reload
                    </Button>
                    <Button variant="contained" onClick={() => navigate("/")}>
                        Back to home
                    </Button>
                </Box>
            </Container>
        </MainLayout>
    );
}
