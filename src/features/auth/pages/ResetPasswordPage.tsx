import { useState } from "react";
import { Button, TextField, Typography } from "@mui/material";

import { requestPasswordReset } from "../api/passwordReset.api";
import { isValidEmail, isNonEmpty } from "@/shared/utils/validation";

// Shared components & messages
import { AuthPageLayout } from "@/shared/components/AuthPageLayout";
import { VALIDATION_MESSAGES } from "@/shared/utils/validation/messages";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const emailIsValid = isValidEmail(email);

  const handleSubmit = async () => {
    if (!emailIsValid) return;

    try {
      await requestPasswordReset(email);
    } catch {
      // Intentionally swallow errors to prevent email enumeration attacks
    } finally {
      setSubmitted(true);
    }
  };

  // Success View
  if (submitted) {
    return (
      <AuthPageLayout
        title="Reset password"
        successMessage="If this email address exists, you will receive an email with instructions to reset your password."
      />
    );
  }

  // Input View
  return (
    <AuthPageLayout title="Reset password">
      <Typography variant="body2" sx={{ mb: 3 }}>
        Enter your user account’s verified email address and we will send you a
        password reset link.
      </Typography>

      <TextField
        fullWidth
        required 
        label="Email address"
        type="email"
        margin="normal"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={isNonEmpty(email) && !emailIsValid}
        helperText={
          isNonEmpty(email) && !emailIsValid
            ? VALIDATION_MESSAGES.EMAIL_INVALID
            : " "
        }
      />

      <Button
        fullWidth
        variant="contained"
        sx={{ mt: 3 }}
        disabled={!emailIsValid}
        onClick={handleSubmit}
      >
        Send password reset email
      </Button>
    </AuthPageLayout>
  );
}