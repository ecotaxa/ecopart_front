import { useMemo, useState } from "react";
import {
    Button,
    TextField,
    Checkbox,
    FormControlLabel,
    Autocomplete,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { CountriesWrapper, CountryOption } from "@/shared/country-wrapper";
import { registerUser } from "../api/register.api";

// Validation utils
import {
    isValidEmail,
    isValidPassword,
    passwordsMatch,
    isNonEmpty,
} from "@/shared/utils/validation";
import { VALIDATION_MESSAGES } from "@/shared/utils/validation/messages";

// Shared components
import { AuthPageLayout } from "@/shared/components/AuthPageLayout";
import { PasswordInput } from "@/shared/components/PasswordInput";

/* ---------------- ORGANISATIONS ---------------- */
// Mock data - should come from API
const organisationTypes = [
    { value: "Sorbonne Université", label: "Sorbonne Université" },
    { value: "CNRS", label: "CNRS" },
];

export default function RegisterPage() {
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form Fields
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [organisation, setOrganisation] = useState("");
    const [countryCode, setCountryCode] = useState<string>("");
    const [usage, setUsage] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // Memoized country list
    const countryOptions = useMemo<CountryOption[]>(
        () => CountriesWrapper.list(),
        []
    );

    // Validation Checkers
    const emailIsValid = isValidEmail(email);
    const passwordIsValid = isValidPassword(password);
    const passwordsAreEqual = passwordsMatch(password, confirm);

    // Global Form Validity
    const formIsValid =
        isNonEmpty(firstName) &&
        isNonEmpty(lastName) &&
        emailIsValid &&
        passwordIsValid &&
        passwordsAreEqual &&
        isNonEmpty(organisation) &&
        isNonEmpty(countryCode) &&
        isNonEmpty(usage) &&
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
                country: countryCode,
                user_planned_usage: usage.trim(),
            });
            setSubmitted(true);
        } catch (err) {
            setSubmitted(false);
            setError(err instanceof Error ? err.message : "Registration failed");
        }
    };

    // Success View
    if (submitted) {
        return (
            <AuthPageLayout
                title="Sign up into EcoPart"
                successMessage="If your registration was successful, you will receive a confirmation email shortly."
            />
        );
    }

    // Registration Form View
    return (
        <AuthPageLayout
            title="Sign up into EcoPart"
            maxWidth="sm"
            error={error}
        >
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        required
                        label="First name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        required
                        label="Last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                    />
                </Grid>

                <Grid size={12}>
                    <TextField
                        fullWidth
                        required
                        label="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={isNonEmpty(email) && !emailIsValid}
                        helperText={
                            !emailIsValid && isNonEmpty(email)
                                ? VALIDATION_MESSAGES.EMAIL_INVALID
                                : " "
                        }
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <PasswordInput
                        fullWidth
                        required
                        label="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={isNonEmpty(password) && !passwordIsValid}
                        helperText={
                            isNonEmpty(password) && !passwordIsValid
                                ? VALIDATION_MESSAGES.PASSWORD_REQ
                                : " "
                        }
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <PasswordInput
                        fullWidth
                        required
                        label="Confirm password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        error={isNonEmpty(confirm) && !passwordsAreEqual}
                        helperText={
                            !passwordsAreEqual && isNonEmpty(confirm)
                                ? VALIDATION_MESSAGES.PASSWORD_MISMATCH
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
                        onInputChange={(_, newValue) => setOrganisation(newValue)}
                        renderInput={(params) => (
                            <TextField {...params} required label="Organisation" />
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
                        renderInput={(params) => <TextField {...params} required label="Country" />}
                    />
                </Grid>

                <Grid size={12}>
                    <TextField
                        fullWidth
                        required
                        multiline
                        minRows={3}
                        label="Planned usage"
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
                required
                label="I agree with the Usage conditions"
            />

            <Button
                fullWidth
                variant="contained"
                sx={{ mt: 4 }}
                // Disable sign up until form is valid
                disabled={!formIsValid}
                onClick={handleSubmit}
            >
                Sign up
            </Button>
        </AuthPageLayout>
    );
}