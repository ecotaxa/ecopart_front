import { useEffect, useState } from "react";
import { Box, Button, CircularProgress } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";

import { validateEmail } from "../api/register.api";
import { AuthPageLayout } from "@/shared/components/AuthPageLayout";

export default function ValidateEmailPage() {
    const { user_id, token } = useParams<{ user_id: string; token: string }>();
    const navigate = useNavigate();

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token || !user_id) {
            Promise.resolve().then(() =>
                setError("Error validating email, please register again.")
            );
            return;
        }

        validateEmail(user_id, token)
            .then(() => {
                navigate("/login", {
                    state: { successMessage: "Your account has been validated. You can now log in." },
                });
            })
            .catch(() => {
                setError("Error validating email, please register again.");
            });
    }, [token, user_id, navigate]);

    if (error) {
        return (
            <AuthPageLayout title="Email Validation" error={error}>
                <Button
                    fullWidth
                    variant="contained"
                    sx={{ mt: 2 }}
                    onClick={() => navigate("/register")}
                >
                    Register again
                </Button>
            </AuthPageLayout>
        );
    }

    return (
        <AuthPageLayout title="Validating your account...">
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <CircularProgress />
            </Box>
        </AuthPageLayout>
    );
}
