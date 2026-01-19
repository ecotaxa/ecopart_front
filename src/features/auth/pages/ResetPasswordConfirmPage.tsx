import { useState } from "react";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import MainLayout from "@/app/layouts/MainLayout";
import { resetPassword } from "../api/passwordReset.api";
import {
  isValidPassword,
  passwordsMatch,
  isNonEmpty,
} from "@/shared/utils/validation";


export default function ResetPasswordConfirmPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordIsValid = isValidPassword(password);
  const passwordsAreEqual = passwordsMatch(password, confirm);


  const formIsValid = isNonEmpty(password) && passwordIsValid && passwordsAreEqual;

  const handleSubmit = async () => {
    if (!token || !formIsValid) return;

    setLoading(true);
    setError(null);

    try {
      await resetPassword(token, password);
      navigate("/login", {
        state: { successMessage: "Your password has been successfully reset." },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Container maxWidth="sm" sx={{ mt: 10, textAlign: "center" }}>
        {/* Logo */}
        <Box
          component="img"
          src="/logo_ecopart_e.png"
          alt="EcoPart"
          sx={{ height: 80, mb: 3 }}
        />

        <Typography variant="h5" gutterBottom>
          Reset password
        </Typography>

        <Typography variant="body2" sx={{ mb: 3 }}>
          Choose your new password
        </Typography>

        <TextField
          fullWidth
          label="Password"
          type={showPassword ? "text" : "password"}
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={isNonEmpty(password) && !passwordIsValid}
          helperText={
            isNonEmpty(password) && !passwordIsValid
              ? "8 chars, uppercase, lowercase, number, special char"
              : " "
          }
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword((v) => !v)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          label="Confirm password"
          type={showPassword ? "text" : "password"}
          margin="normal"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={isNonEmpty(confirm) && !formIsValid}
          helperText={
            isNonEmpty(confirm) && !formIsValid
              ? "Passwords do not match"
              : " "
          }
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Button
          fullWidth
          variant="contained"
          sx={{ mt: 3 }}
          disabled={!passwordIsValid || loading}
          onClick={handleSubmit}
        >
          {loading ? "Saving…" : "Reset password"}
        </Button>
      </Container>
    </MainLayout>
  );
}
