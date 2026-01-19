import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  IconButton,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { CountriesWrapper, CountryOption } from "@/shared/country-wrapper";


import MainLayout from "@/app/layouts/MainLayout";
import { registerUser } from "../api/register.api";

/* ---------------- VALIDATIONS ---------------- */

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidPassword = (password: string) =>
  password.length >= 8 &&
  /[0-9]/.test(password) &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /[@!#$%^&*()_+.,;:]/.test(password);

/* ---------------- ORGANISATIONS ---------------- */

const organisationTypes = [
  { value: "Sorbonne Université", label: "Sorbonne Université" },
  { value: "CNRS", label: "CNRS" },
];

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [organisation, setOrganisation] = useState("");

  // ✅ Store ISO code ("FR") as requested
  const [countryCode, setCountryCode] = useState<string>("");

  const [usage, setUsage] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const countryOptions = useMemo<CountryOption[]>(
    () => CountriesWrapper.list(),
    []
  );



  const emailIsValid = isValidEmail(email);
  const passwordIsValid = isValidPassword(password);
  const passwordsMatch = password === confirm;

  const formIsValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    emailIsValid &&
    passwordIsValid &&
    passwordsMatch &&
    organisation.trim().length > 0 &&
    countryCode.trim().length > 0 &&
    usage.trim().length > 0 &&
    acceptedTerms;

  const handleSubmit = async () => {
    if (!formIsValid) return;

    setError(null);

    try {
      await registerUser({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
        organisation: organisation.trim(),
        country: countryCode, // ✅ send "FR"
        user_planned_usage: usage.trim(), // REQUIRED by backend
      });

      setSubmitted(true);
    } catch (err) {
      setSubmitted(false);
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <MainLayout>
      <Container maxWidth="md" sx={{ mt: 10, textAlign: "center" }}>
        <Box
          component="img"
          src="/logo_ecopart_e.png"
          alt="EcoPart"
          sx={{ height: 80, mb: 3 }}
        />

        <Typography variant="h5" gutterBottom>
          Sign up into EcoPart
        </Typography>

        {submitted ? (
          <Alert severity="success" sx={{ mt: 4 }}>
            If your registration was successful, you will receive a confirmation
            email shortly.
          </Alert>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>
                {error}
              </Alert>
            )}

            {/* Grid design */}
            <Grid container spacing={2} sx={{ mt: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="First name*"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Last name*"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </Grid>

              <Grid size={12}>
                <TextField
                  fullWidth
                  label="Email*"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={email.length > 0 && !emailIsValid}
                  helperText={
                    !emailIsValid && email.length > 0
                      ? "Invalid email address"
                      : " "
                  }
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Password*"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={password.length > 0 && !passwordIsValid}
                  helperText={
                    password.length > 0 && !passwordIsValid
                      ? "8 chars, uppercase, lowercase, number, special char"
                      : " "
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((v) => !v)}>
                          {showPassword ? (
                            <VisibilityOffIcon />
                          ) : (
                            <VisibilityIcon />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Confirm password*"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  error={confirm.length > 0 && !passwordsMatch}
                  helperText={
                    !passwordsMatch && confirm.length > 0
                      ? "Passwords do not match"
                      : " "
                  }
                />
              </Grid>

              <Grid size={12}>
                <Autocomplete
                  freeSolo
                  fullWidth
                  options={organisationTypes.map((o) => o.value)}
                  value={organisation}
                  onInputChange={(_, newValue) => {
                    setOrganisation(newValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Organisation*"
                      helperText="Select your organisation or type a new one"
                      // Customize helper text style
                      FormHelperTextProps={{
                      sx: {
                        fontSize: '1rem',  
                        color: '#7FB3E6', 
                        fontWeight: 600,    
                      }
                    }}
                    />
                  )}
                />

              </Grid>

              <Grid size={12}>
                <Autocomplete
                  fullWidth
                  options={countryOptions}
                  getOptionLabel={(o) => o.name}
                  isOptionEqualToValue={(o, v) => o.code === v.code}
                  value={countryOptions.find((c) => c.code === countryCode) ?? null}
                  onChange={(_, newValue) => {
                    setCountryCode(newValue ? newValue.code : "");
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Country*" />
                  )}
                />

              </Grid>

              <Grid size={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Planned usage*"
                  value={usage}
                  onChange={(e) => setUsage(e.target.value)}
                />
              </Grid>
            </Grid>

            <FormControlLabel
              sx={{ mt: 2 }}
              control={
                <Checkbox
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
              }
              label="I agree with the Usage conditions"
            />

            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 4 }}
              disabled={!formIsValid}
              onClick={handleSubmit}
            >
              Sign up
            </Button>
          </>
        )}
      </Container>
    </MainLayout>
  );
}
