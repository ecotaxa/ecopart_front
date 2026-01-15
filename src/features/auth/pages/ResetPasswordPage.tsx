import { useState } from "react";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
} from "@mui/material";

import MainLayout from "@/app/layouts/MainLayout";
import { requestPasswordReset } from "../api/passwordReset.api";

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const emailIsValid = isValidEmail(email);

  const handleSubmit = async () => {
  if (!emailIsValid) return;

  try {
    await requestPasswordReset(email);
  } catch {
    // Intentionally ignore all errors
    // Prevent email enumeration & UX issues
  } finally {
    // 🔴 ALWAYS show success message
    setSubmitted(true);
  }
};


  return (
    <MainLayout>
      <Container maxWidth="sm" sx={{ mt: 10, textAlign: "center" }}>
        <Box
          component="img"
          src="/logo_ecopart_e.png"
          alt="EcoPart"
          sx={{ height: 80, mb: 3 }}
        />

        <Typography variant="h5" gutterBottom>
          Reset password
        </Typography>

        {!submitted && (
            <Typography variant="body2" sx={{ mb: 3 }}>
                Enter your user account’s verified email address and we will send you a
                password reset link.
            </Typography>
        )}

        {submitted ? (
          <Alert severity="success">
            If this email address exists, you will receive an email with
            instructions to reset your password.
          </Alert>
        ) : (
          <>
            <TextField
              fullWidth
              label="Email address"
              type="email"
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={email.length > 0 && !emailIsValid}
              helperText={
                email.length > 0 && !emailIsValid
                  ? "Please enter a valid email address"
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
          </>
        )}
      </Container>
    </MainLayout>
  );
}
