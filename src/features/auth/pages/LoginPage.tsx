import { useState } from "react";
import {
    Button,
    TextField,
    Box,
    Link,
    CircularProgress,
} from "@mui/material";
import { useNavigate, Navigate, useLocation } from "react-router-dom";

import { loginRequest, fetchMe, InvalidCredentialsError } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";

// Validation utilities
import { isValidEmail, isNonEmpty } from "@/shared/utils/validation";
import { VALIDATION_MESSAGES } from "@/shared/utils/validation/messages";

// Shared components
import { AuthPageLayout } from "@/shared/components/AuthPageLayout";
import { PasswordInput } from "@/shared/components/PasswordInput";

/** Where a freshly logged-in user lands when no protected page redirected them here. */
const DEFAULT_AFTER_LOGIN = "/dashboard";

export default function LoginPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const setUser = useAuthStore((s) => s.setUser);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    // Form State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // location.state is untyped: narrow what we read from it.
    const navState = location.state as { successMessage?: unknown; from?: unknown } | null;
    const successMessage = typeof navState?.successMessage === "string" ? navState.successMessage : undefined;
    // Only in-app paths are honoured (never an absolute URL), so the redirect
    // can't be abused to send the user off-site.
    const from = typeof navState?.from === "string" && navState.from.startsWith("/") && !navState.from.startsWith("//")
        ? navState.from
        : DEFAULT_AFTER_LOGIN;

    // Validation Logic
    const emailIsValid = isValidEmail(email);
    const passwordIsFilled = isNonEmpty(password);

    // Disable button if email is invalid or password is empty
    const formIsValid = emailIsValid && passwordIsFilled;

    // Redirect if already authenticated
    if (isAuthenticated) {
        return <Navigate to={from} replace />;
    }

    const handleSubmit = async () => {
        if (loading || !formIsValid) return;

        setLoading(true);
        setError(null);

        try {
            await loginRequest(email, password);
            const user = await fetchMe();
            setUser(user);
            navigate(from, { replace: true });
        } catch (err) {
            console.error("Login error:", err);
            // Wrong credentials and a backend outage are different problems:
            // don't tell the user their password is wrong when the server is down.
            setError(err instanceof InvalidCredentialsError ? VALIDATION_MESSAGES.LOGIN_FAILED : VALIDATION_MESSAGES.GENERIC_ERROR);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthPageLayout
            title="Login into EcoPart"
            error={error}
            successMessage={successMessage}
        >
            <Box
                component="form"
                noValidate
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }}
            >
                <TextField
                    fullWidth
                    required
                    label="Email address"
                    placeholder="your@email.com"
                    margin="normal"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    // Show error only if user has typed something and it's invalid
                    error={isNonEmpty(email) && !emailIsValid}
                    helperText={
                        isNonEmpty(email) && !emailIsValid
                            ? VALIDATION_MESSAGES.EMAIL_INVALID
                            : " "
                    }
                />

                <PasswordInput
                    fullWidth
                    required
                    label="Password"
                    margin="normal"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                />

                <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    sx={{ mt: 3, height: 48 }}
                    // Button is disabled if form is invalid or request is loading
                    disabled={loading || !formIsValid}
                    // We add a testId to specifically target this button in tests,
                    // avoiding confusion with the "Log in" button in the header.
                    data-testid="auth-submit"
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : "LOG IN"}
                </Button>

                <Box
                    sx={{
                        mt: 2,
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                    }}
                >
                    <Link
                        component="button"
                        type="button"
                        variant="body2"
                        onClick={() => navigate("/reset-password")}
                    >
                        Forgot password
                    </Link>

                    <Link
                        component="button"
                        type="button"
                        variant="body2"
                        onClick={() => navigate("/register")}
                    >
                        New on EcoPart? Create an account!
                    </Link>
                </Box>
            </Box>
        </AuthPageLayout>
    );
}
