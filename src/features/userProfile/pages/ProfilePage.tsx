import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Container,
    TextField,
    Typography,
    Tabs,
    Tab,
    Paper,
    Autocomplete,
    Divider,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Stack
} from "@mui/material";
import Grid from "@mui/material/Grid";
import PersonIcon from "@mui/icons-material/Person";
import CloudIcon from "@mui/icons-material/Cloud";
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'; // Icon for admin
import { useNavigate } from "react-router-dom";

// Shared components & layouts
import MainLayout from "@/app/layouts/MainLayout";
import { CountriesWrapper, CountryOption } from "@/shared/country-wrapper";
import { PasswordInput } from "@/shared/components/PasswordInput";

// Validation utils
import {
    isNonEmpty,
    isValidPassword,
    passwordsMatch,
} from "@/shared/utils/validation";
import { VALIDATION_MESSAGES } from "@/shared/utils/validation/messages";

// Feature imports (Local API)
import { fetchMe, updateProfile, changePassword, deleteAccount } from "../api/profile.api";
import { User } from "@/features/auth/types/user";

// Auth Store (to logout user after deletion)
import { useAuthStore } from "@/features/auth/store/auth.store";

/* ---------------- CONSTANTS ---------------- */
const organisationTypes = [
    { value: "Sorbonne Université", label: "Sorbonne Université" },
    { value: "CNRS", label: "CNRS" },
];

export default function ProfilePage() {
    const navigate = useNavigate();
    // Get setUser to update profile locally, and clearUser for deletion
    const { setUser, clearUser } = useAuthStore();

    const [tabValue, setTabValue] = useState(0);
    const [loadingUser, setLoadingUser] = useState(true);

    // --- STATES: PROFILE ---
    const [user, setUserData] = useState<User | null>(null);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [organisation, setOrganisation] = useState("");
    const [countryCode, setCountryCode] = useState<string>("");
    const [plannedUsage, setPlannedUsage] = useState("");

    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // --- STATES: PASSWORD ---
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // --- STATES: DELETE ACCOUNT ---
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const countryOptions = useMemo<CountryOption[]>(
        () => CountriesWrapper.list(),
        []
    );

    // --- INITIAL LOAD ---
    useEffect(() => {
        const loadUserData = async () => {
            try {
                const userData = await fetchMe();
                setUserData(userData);

                setFirstName(userData.first_name || "");
                setLastName(userData.last_name || "");
                setEmail(userData.email || "");
                setOrganisation(userData.organisation || "");

                const code = userData.country ? userData.country.toUpperCase() : "";

                const isValidCode = countryOptions.some((c) => c.code === code);
                setCountryCode(isValidCode ? code : "");

                setPlannedUsage(userData.user_planned_usage || "");
            } catch (error) {
                console.error("Failed to load user", error);
            } finally {
                setLoadingUser(false);
            }
        };

        loadUserData();
    }, [countryOptions]);

    // --- HANDLERS ---

    const handleProfileSave = async () => {
        if (!user) return;

        setProfileMessage(null);
        setProfileSaving(true);

        try {
            // API Call: Update profile
            const updatedProfileData = await updateProfile(user.user_id, {
                first_name: firstName,
                last_name: lastName,
                organisation,
                country: countryCode,
                user_planned_usage: plannedUsage,
            });

            // Merge the new profile data with the existing user data.
            // This prevents losing fields like 'is_admin' or 'email' if the update API 
            // doesn't return the full user object (or returns is_admin: false by default).
            const mergedUser = { ...user, ...updatedProfileData };

            // Update local state and global auth store to reflect changes immediately
            setUserData(mergedUser);
            setUser(mergedUser);

            setProfileMessage({ type: "success", text: "Profile updated successfully." });
        } catch (err) {
            console.error(err);
            setProfileMessage({ type: "error", text: "Failed to update profile." });
        } finally {
            setProfileSaving(false);
        }
    };

    const handleProfileCancel = () => {
        // Reset fields to original user data
        if (user) {
            setFirstName(user.first_name || "");
            setLastName(user.last_name || "");
            setOrganisation(user.organisation || "");
            setCountryCode(user.country || "");
            setPlannedUsage(user.user_planned_usage || "");
            setProfileMessage(null);
        }
    };

    const handleChangePassword = async () => {
        // Validate inputs locally first
        if (!user || !isNonEmpty(currentPassword) || !isValidPassword(newPassword) || !passwordsMatch(newPassword, confirmPassword)) return;

        setPasswordMessage(null);
        setPasswordSaving(true);

        try {
            // API Call: Change password (sending user_id, old password, new password)
            await changePassword(user.user_id, currentPassword, newPassword);

            setPasswordMessage({ type: "success", text: "Password changed successfully." });
            // Reset password fields on success
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            console.error(err);
            // Try to extract backend error message
            const msg = err instanceof Error ? err.message : "Failed to change password.";
            setPasswordMessage({ type: "error", text: msg });
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleDeleteClick = () => {
        setOpenDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (!user) return;
        setDeleteError(null);

        try {
            // 1. Call API to delete (or anonymize) the user in DB
            await deleteAccount(user.user_id);

            // 2. Clear local session (Logout) using the dedicated store action
            clearUser();

            // 3. Redirect to login page with a success message
            navigate("/login", {
                state: { successMessage: "Your account has been successfully deleted." }
            });

        } catch (err) {
            console.error(err);
            setDeleteError("Failed to delete account. Please try again or contact support.");
            setOpenDeleteDialog(false); // Close dialog to show error on page
        }
    };

    // --- VALIDATION LOGIC ---
    const passwordIsValid = isValidPassword(newPassword);
    const passwordsAreEqual = passwordsMatch(newPassword, confirmPassword);
    // Button enabled only if all fields are filled and valid
    const canSavePassword = isNonEmpty(currentPassword) && isNonEmpty(newPassword) && passwordIsValid && passwordsAreEqual;

    // Prevent saving profile if required fields are empty
    const canSaveProfile =
        isNonEmpty(firstName) &&
        isNonEmpty(lastName) &&
        isNonEmpty(organisation) &&
        isNonEmpty(countryCode) &&
        isNonEmpty(plannedUsage);

    if (loadingUser) {
        return (
            <MainLayout>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
                    <CircularProgress />
                </Box>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <Container maxWidth="md" sx={{ mt: 4, mb: 8, textAlign: "left" }}>

                {/* Main Page Header */}
                <Typography variant="h4" sx={{ mb: 2 }}>
                    Settings
                </Typography>

                {/* --- TABS --- */}
                <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                        <Tab
                            icon={<PersonIcon />}
                            iconPosition="start"
                            label="ECOPART ACCOUNT"
                        />
                        <Tab
                            icon={<CloudIcon />}
                            iconPosition="start"
                            label="ECOTAXA ACCOUNTS"
                            disabled
                        />
                    </Tabs>
                </Box>

                {/* --- SECTION: PROFILE --- */}
                <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>

                    {/* Header inside the card: Title + Admin Button */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="h6">
                            Profile
                        </Typography>

                        {/* Admin Button */}
                        {user?.is_admin && (
                            <Button
                                variant="contained"
                                color="secondary"
                                size="small" // Smaller size fits better in a card header
                                startIcon={<AdminPanelSettingsIcon />}
                                onClick={() => navigate('/admin')}
                            >
                                ADMIN DASHBOARD
                            </Button>
                        )}
                    </Stack>

                    <Divider sx={{ mb: 3 }} />

                    {profileMessage && (
                        <Alert severity={profileMessage.type} sx={{ mb: 2 }}>
                            {profileMessage.text}
                        </Alert>
                    )}

                    <Grid container spacing={2}>
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

                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                label="Email" // Removed asterisk as it's disabled
                                value={email}
                                disabled
                                helperText="Contact admin to change email"
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Autocomplete
                                freeSolo
                                fullWidth
                                options={organisationTypes.map((o) => o.value)}
                                value={organisation}
                                onInputChange={(_, val) => setOrganisation(val)}
                                renderInput={(params) => <TextField {...params} label="Organisation*" />}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <Autocomplete
                                fullWidth
                                options={countryOptions}
                                getOptionLabel={(o) => o.name}
                                // Improved comparison to avoid bugs
                                isOptionEqualToValue={(option, value) => option.code === value.code}
                                // Search for the complete object corresponding to the code, or null if not found
                                value={countryOptions.find((c) => c.code === countryCode) || null}
                                // Clean reset management (val is null if emptied)
                                onChange={(_, val) => setCountryCode(val ? val.code : "")}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Country*"
                                        error={!countryCode && !loadingUser}
                                        helperText={!countryCode && !loadingUser ? "Please select a country" : ""}
                                    />
                                )}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                multiline
                                minRows={3}
                                label="Planned usage*"
                                value={plannedUsage}
                                onChange={(e) => setPlannedUsage(e.target.value)}
                                helperText="Describe briefly how you plan to use the data."
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleProfileSave}
                            disabled={profileSaving || !canSaveProfile}
                        >
                            {profileSaving ? "Saving..." : "SAVE"}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleProfileCancel}
                            disabled={profileSaving}
                        >
                            CANCEL
                        </Button>
                    </Box>
                </Paper>

                {/* --- SECTION: SECURITY (Change Password) --- */}
                <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
                    Security
                </Typography>
                <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        Change password
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    {passwordMessage && (
                        <Alert severity={passwordMessage.type} sx={{ mb: 2 }}>
                            {passwordMessage.text}
                        </Alert>
                    )}

                    <Grid container spacing={2}>

                        <Grid size={{ xs: 12 }}>
                            <PasswordInput
                                fullWidth
                                label="Current password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <PasswordInput
                                fullWidth
                                label="New password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                error={isNonEmpty(newPassword) && !passwordIsValid}
                                helperText={
                                    isNonEmpty(newPassword) && !passwordIsValid
                                        ? VALIDATION_MESSAGES.PASSWORD_REQ
                                        : " "
                                }
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <PasswordInput
                                fullWidth
                                label="Re-type new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                error={isNonEmpty(confirmPassword) && !passwordsAreEqual}
                                helperText={
                                    isNonEmpty(confirmPassword) && !passwordsAreEqual
                                        ? VALIDATION_MESSAGES.PASSWORD_MISMATCH
                                        : " "
                                }
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 3 }}>
                        <Button
                            variant="outlined"
                            onClick={handleChangePassword}
                            disabled={!canSavePassword || passwordSaving}
                        >
                            {passwordSaving ? "Changing..." : "CHANGE"}
                        </Button>
                    </Box>
                </Paper>

                {/* --- SECTION: DELETE ACCOUNT --- */}
                <Paper variant="outlined" sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Delete account
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    {deleteError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {deleteError}
                        </Alert>
                    )}

                    <Typography variant="body2" color="text.secondary" paragraph>
                        Your account will be deactivated. You will not be able to connect to EcoPart anymore.
                        To completely delete your account, please send an email to contact@ecopart.fr
                    </Typography>

                    <Button
                        variant="outlined"
                        color="error"
                        sx={{ mt: 1 }}
                        onClick={handleDeleteClick}
                    >
                        DELETE
                    </Button>
                </Paper>

                {/* Confirmation Dialog */}
                <Dialog
                    open={openDeleteDialog}
                    onClose={() => setOpenDeleteDialog(false)}
                >
                    <DialogTitle>Delete Account?</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Are you sure you want to delete your account? This action cannot be undone.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
                        <Button onClick={handleConfirmDelete} color="error" autoFocus>
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>

            </Container>
        </MainLayout>
    );
}