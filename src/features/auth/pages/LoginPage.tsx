import { useState } from "react";
import {
Button,
TextField,
Box,
Checkbox,
FormControlLabel,
Link,
CircularProgress,
} from "@mui/material";
import { useNavigate, Navigate, useLocation } from "react-router-dom";

import { loginRequest, fetchMe } from "../api/auth.api";
import { useAuthStore } from "../store/auth.store";

// Validation utilities
import { isValidEmail, isNonEmpty } from "@/shared/utils/validation";
import { VALIDATION_MESSAGES } from "@/shared/utils/validation/messages";

// Shared components
import { AuthPageLayout } from "@/shared/components/AuthPageLayout";
import { PasswordInput } from "@/shared/components/PasswordInput";

export default function LoginPage() {
const location = useLocation();
const navigate = useNavigate();
const setUser = useAuthStore((s) => s.setUser);
const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

// Form State
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [rememberMe, setRememberMe] = useState(false);

// UI State
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const successMessage = location.state?.successMessage;

// Validation Logic
const emailIsValid = isValidEmail(email);
const passwordIsFilled = isNonEmpty(password);

// Disable button if email is invalid or password is empty
const formIsValid = emailIsValid && passwordIsFilled;

// Redirect if already authenticated
if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
}

const handleSubmit = async () => {
    if (loading || !formIsValid) return;

    setLoading(true);
    setError(null);

    try {
    await loginRequest(email, password);
    const user = await fetchMe();
    setUser(user);
    navigate("/dashboard");
    } catch {
    setError("Invalid email or password");
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
    <Box>
        <TextField
        fullWidth
        required 
        label="Email address"
        placeholder="your@email.com"
        margin="normal"
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
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
        onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
        }}
        />

        <FormControlLabel
        sx={{ alignSelf: "flex-start", mt: 1 }}
        control={
            <Checkbox
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            />
        }
        label="Remember me"
        />

        <Button
        fullWidth
        variant="contained"
        sx={{ mt: 3, height: 48 }}
        onClick={handleSubmit}
        // Button is disabled if form is invalid or request is loading
        disabled={loading || !formIsValid}
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
            variant="body2"
            onClick={() => navigate("/reset-password")}
        >
            Forgot password
        </Link>

        <Link
            component="button"
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