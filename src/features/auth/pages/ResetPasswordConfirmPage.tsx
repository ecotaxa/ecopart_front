import { useState } from "react";
import { Button, Typography } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";

import { resetPassword } from "../api/passwordReset.api";
import {
    isValidPassword,
    passwordsMatch,
    isNonEmpty,
} from "@/shared/utils/validation";

// Shared components & messages
import { AuthPageLayout } from "@/shared/components/AuthPageLayout";
import { PasswordInput } from "@/shared/components/PasswordInput";
import { VALIDATION_MESSAGES } from "@/shared/utils/validation/messages";

export default function ResetPasswordConfirmPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    // Form State
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");

    // UI State
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Validation Checkers
    // Enforces complexity: 8 chars, Upper, Lower, Number, Special char
    const passwordIsValid = isValidPassword(password);
    const passwordsAreEqual = passwordsMatch(password, confirm);

    const formIsValid =
        isNonEmpty(password) && passwordIsValid && passwordsAreEqual;

    const handleSubmit = async () => {
        if (!token || !formIsValid) return;

        setLoading(true);
        setError(null);

        try {
            await resetPassword(token, password);
            // Redirect to login with success toast
            navigate("/login", {
                state: { successMessage: "Your password has been successfully reset." },
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unexpected error");
            setLoading(false);
        }
    };

    return (
        <AuthPageLayout title="Reset password" error={error}>
            <Typography variant="body2" sx={{ mb: 3 }}>
                Choose your new password
            </Typography>

            <PasswordInput
                fullWidth
                required
                label="Password"
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={isNonEmpty(password) && !passwordIsValid}
                // Uses the updated message with special chars list
                helperText={
                    isNonEmpty(password) && !passwordIsValid
                        ? VALIDATION_MESSAGES.PASSWORD_REQ
                        : " "
                }
            />

            <PasswordInput
                fullWidth
                required
                label="Confirm password"
                margin="normal"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                error={isNonEmpty(confirm) && !formIsValid}
                helperText={
                    isNonEmpty(confirm) && !formIsValid
                        ? VALIDATION_MESSAGES.PASSWORD_MISMATCH
                        : " "
                }
            />

            <Button
                fullWidth
                variant="contained"
                sx={{ mt: 3 }}
                // Prevent submission if password logic is not satisfied
                disabled={!formIsValid || loading}
                onClick={handleSubmit}
            >
                {loading ? "Saving…" : "Reset password"}
            </Button>
        </AuthPageLayout>
    );
}
