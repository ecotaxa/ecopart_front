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
    Stack,
    IconButton // Added for the logout icon
} from "@mui/material";
import Grid from "@mui/material/Grid";
import PersonIcon from "@mui/icons-material/Person";
import CloudIcon from "@mui/icons-material/Cloud";
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'; // Icon for admin
// New icons for the list view to match mockup
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';

import { useNavigate } from "react-router-dom";

// Shared components & layouts
import MainLayout from "@/app/layouts/MainLayout";
import { CountriesWrapper, CountryOption } from "@/shared/country-wrapper";
import { PasswordInput } from "@/shared/components/PasswordInput";

import { useEffect, useMemo, useState, useCallback } from "react";

// Validation utils
import {
    isNonEmpty,
    isValidPassword,
    passwordsMatch,
} from "@/shared/utils/validation";
import { VALIDATION_MESSAGES } from "@/shared/utils/validation/messages";

// Feature imports (Local API)
// Added getEcoTaxaAccounts, EcoTaxaAccountLink and unlinkEcoTaxaAccount to imports
import {
    fetchMe,
    updateProfile,
    changePassword,
    deleteAccount,
    // linkEcoTaxaAccount, <-- REMOVED: handled by child component now
    getEcoTaxaAccounts, // New API call
    unlinkEcoTaxaAccount, // New API call for unlinking
    type EcoTaxaAccountLink // New Type
} from "../api/profile.api";
import { User } from "@/features/auth/types/user";

// Auth Store (to logout user after deletion)
import { useAuthStore } from "@/features/auth/store/auth.store";

// NEW IMPORT: The extracted Login Form Component
import { EcoTaxaLoginForm } from "../components/EcoTaxaLoginForm";

/* ---------------- CONSTANTS ---------------- */
const organisationTypes = [
    { value: "Sorbonne Université", label: "Sorbonne Université" },
    { value: "CNRS", label: "CNRS" },
];

// NOTE: ECOTAXA_INSTANCES constant has been moved to EcoTaxaLoginForm component
// as it is specific to the form logic.

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

    // --- STATES: DELETE ACCOUNT (Global EcoPart) ---
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // --- STATES: ECOTAXA LINK ---
    // REMOVED: All local states for the form (etEmail, etPassword, etc.) have been moved to the child component.
    // This dramatically cleans up the parent component and prevents state pollution.

    // --- STATES: LINKED ACCOUNTS LIST & UNLINK ---
    const [linkedAccounts, setLinkedAccounts] = useState<EcoTaxaAccountLink[]>([]);
    const [showLinkForm, setShowLinkForm] = useState(false);

    // New states for the Unlink Confirmation Dialog
    const [openUnlinkDialog, setOpenUnlinkDialog] = useState(false);
    const [accountToUnlink, setAccountToUnlink] = useState<number | null>(null);

    const countryOptions = useMemo<CountryOption[]>(
        () => CountriesWrapper.list(),
        []
    );

    // --- HELPERS ---
    const fetchLinkedAccounts = useCallback(async (userId: number) => {
        try {
            const accounts = await getEcoTaxaAccounts(userId);
            setLinkedAccounts(accounts);
            // Logic: If user has accounts, default to list view (hide form). 
            // If no accounts, show form.
            if (accounts && accounts.length > 0) {
                setShowLinkForm(false);
            } else {
                setShowLinkForm(true);
            }
        } catch (err) {
            console.error("Failed to load linked accounts", err);
            // SAFETY NET: If the API fails, show the form so the user isn't stuck on an empty screen
            setLinkedAccounts([]);
            setShowLinkForm(true);
        }
    }, []);

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

                // NEW: Load connected accounts immediately when profile loads
                fetchLinkedAccounts(userData.user_id);

            } catch (error) {
                console.error("Failed to load user", error);
            } finally {
                setLoadingUser(false);
            }
        };

        loadUserData();
    }, [countryOptions, fetchLinkedAccounts]);

    const getDaysLeft = (expirationDate: string) => {
        if (!expirationDate) return 0;
        const today = new Date();
        const exp = new Date(expirationDate);
        const diffTime = exp.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    // --- HANDLERS ---

    // ... (Keep handleProfileSave, handleProfileCancel, handleChangePassword, handleDeleteClick, handleConfirmDelete AS IS) ...
    const handleProfileSave = async () => { 
        if (!user) return;
        setProfileMessage(null);
        setProfileSaving(true);
        try {
            const updatedProfileData = await updateProfile(user.user_id, {
                first_name: firstName, last_name: lastName, organisation, country: countryCode, user_planned_usage: plannedUsage,
            });
            const mergedUser = { ...user, ...updatedProfileData };
            setUserData(mergedUser); setUser(mergedUser);
            setProfileMessage({ type: "success", text: "Profile updated successfully." });
        } catch (err) {
            console.error(err);
            setProfileMessage({ type: "error", text: "Failed to update profile." });
        } finally { setProfileSaving(false); }
    };

    const handleProfileCancel = () => { 
        if (user) {
            setFirstName(user.first_name || ""); setLastName(user.last_name || ""); setOrganisation(user.organisation || ""); setCountryCode(user.country || ""); setPlannedUsage(user.user_planned_usage || ""); setProfileMessage(null);
        }
    };

    const handleChangePassword = async () => { 
        if (!user || !isNonEmpty(currentPassword) || !isValidPassword(newPassword) || !passwordsMatch(newPassword, confirmPassword)) return;
        setPasswordMessage(null); setPasswordSaving(true);
        try {
            await changePassword(user.user_id, currentPassword, newPassword);
            setPasswordMessage({ type: "success", text: "Password changed successfully." });
            setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        } catch (err) {
            console.error(err);
            const msg = err instanceof Error ? err.message : "Failed to change password.";
            setPasswordMessage({ type: "error", text: msg });
        } finally { setPasswordSaving(false); }
    };

    const handleDeleteClick = () => { setOpenDeleteDialog(true); };

    const handleConfirmDelete = async () => { 
        if (!user) return;
        setDeleteError(null);
        try {
            await deleteAccount(user.user_id); clearUser();
            navigate("/login", { state: { successMessage: "Your account has been successfully deleted." } });
        } catch (err) {
            console.error(err);
            setDeleteError("Failed to delete account. Please try again or contact support.");
            setOpenDeleteDialog(false);
        }
    };

    // --- REMOVED: handleLinkEcoTaxa ---
    // The logic is now inside the child component.

    // --- NEW HANDLER: Callback from Child ---
    const handleLoginSuccess = async () => {
        if (!user) return;
        // 1. Refresh list
        await fetchLinkedAccounts(user.user_id);
        // 2. Hide form (Component will unmount and reset state automatically)
        setShowLinkForm(false);
    };

    // --- HANDLERS: ECOTAXA UNLINK ---

    // 1. User clicks the Logout icon -> Open confirmation dialog
    const handleUnlinkClick = (accountId: number) => {
        setAccountToUnlink(accountId);
        setOpenUnlinkDialog(true);
    };

    // 2. User confirms -> Call API and refresh list
    const handleConfirmUnlink = async () => {
        if (!user || !accountToUnlink) return;

        try {
            await unlinkEcoTaxaAccount(user.user_id, accountToUnlink);
            // No global message needed here as the item just disappears from list
            // Refresh list
            await fetchLinkedAccounts(user.user_id);
        } catch (err) {
            console.error("Failed to unlink account", err);
            // Optional: set a global error message if needed
        } finally {
            setOpenUnlinkDialog(false);
            setAccountToUnlink(null);
        }
    };

    // --- VALIDATION LOGIC ---
    const passwordIsValid = isValidPassword(newPassword);
    const passwordsAreEqual = passwordsMatch(newPassword, confirmPassword);
    const canSavePassword = isNonEmpty(currentPassword) && isNonEmpty(newPassword) && passwordIsValid && passwordsAreEqual;
    const canSaveProfile = isNonEmpty(firstName) && isNonEmpty(lastName) && isNonEmpty(organisation) && isNonEmpty(countryCode) && isNonEmpty(plannedUsage);

    // REMOVED: canLinkEcoTaxa, selectedEtInstance (moved to child)

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
            <Container maxWidth="sm" sx={{ mt: 4, mb: 8, textAlign: "left" }}>

                <Typography variant="h4" sx={{ mb: 2 }}>Settings</Typography>

                <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                        <Tab icon={<PersonIcon />} iconPosition="start" label="ECOPART ACCOUNT" />
                        <Tab icon={<CloudIcon />} iconPosition="start" label="ECOTAXA ACCOUNTS" />
                    </Tabs>
                </Box>

                {/* TAB 0: ECOPART PROFILE (Collapsed for brevity) */}
                {tabValue === 0 && (
                    <>
                        {/* ... Reuse your existing Profile & Password sections here ... */}
                        <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="h6">Profile</Typography>
                                {user?.is_admin && <Button variant="contained" color="secondary" size="small" startIcon={<AdminPanelSettingsIcon />} onClick={() => navigate('/admin')}>ADMIN DASHBOARD</Button>}
                            </Stack>
                            <Divider sx={{ mb: 3 }} />
                            {profileMessage && <Alert severity={profileMessage.type} sx={{ mb: 2 }}>{profileMessage.text}</Alert>}
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
                                        label="Email"
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
                                        renderInput={(params) => <TextField {...params} label="Organisation*"
                                        />}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <Autocomplete
                                        fullWidth
                                        options={countryOptions}
                                        getOptionLabel={(o) => o.name}
                                        isOptionEqualToValue={(option, value) => option.code === value.code}
                                        value={countryOptions.find((c) => c.code === countryCode) || null}
                                        onChange={(_, val) => setCountryCode(val ? val.code : "")
                                        }
                                        renderInput={(params) => <TextField {...params}
                                            label="Country*"
                                            error={!countryCode && !loadingUser}
                                            helperText={!countryCode && !loadingUser ? "Please select a country" : ""}
                                        />
                                        }
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
                                <Button variant="contained" onClick={handleProfileSave} disabled={profileSaving || !canSaveProfile}>{profileSaving ? "Saving..." : "SAVE"}</Button>
                                <Button variant="outlined" onClick={handleProfileCancel} disabled={profileSaving}>CANCEL</Button>
                            </Box>
                        </Paper>

                        {/* Keep Password and Delete sections... */}
                        {/* ... */}
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
                    </>
                )}

                {/* TAB 1: ECOTAXA LINK */}
                {tabValue === 1 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>Accounts on EcoTaxa instances</Typography>

                        {/* LIST VIEW */}
                        {!showLinkForm && (
                            <Stack spacing={2} sx={{ mt: 2 }}>
                                {linkedAccounts.map((account) => (
                                    <Paper
                                        key={account.ecotaxa_account_id}
                                        variant="outlined"
                                        sx={{
                                            p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            backgroundColor: '#F0F7FF', borderColor: '#90CAF9'
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <CheckCircleOutlineIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                                            <Box>
                                                <Typography variant="subtitle1" fontWeight="bold">
                                                    {account.ecotaxa_user_login || account.ecotaxa_user_name} ({account.ecotaxa_account_instance_name})
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {getDaysLeft(account.ecotaxa_expiration_date)} days left
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* UNLINK BUTTON: Now clickable */}
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            // Pass the ID to the handler
                                            onClick={() => handleUnlinkClick(account.ecotaxa_account_id)}
                                        >
                                            <LogoutIcon />
                                        </IconButton>
                                    </Paper>
                                ))}

                                <Button
                                    variant="outlined" color="inherit" fullWidth startIcon={<AddIcon />}
                                    onClick={() => setShowLinkForm(true)}
                                    sx={{ justifyContent: 'flex-start', p: 2, textTransform: 'none', borderColor: 'divider', color: 'text.primary' }}
                                >
                                    Connect to another account
                                </Button>
                            </Stack>
                        )}

                        {/* FORM VIEW (Refactored to use Child Component) */}
                        {showLinkForm && user && (
                            <Paper variant="outlined" sx={{ p: 4, mt: 2 }}>
                                <EcoTaxaLoginForm
                                    userId={user.user_id}
                                    onSuccess={handleLoginSuccess} // Callback to refresh list and hide form after successful login
                                    onCancel={() => setShowLinkForm(false)}
                                    showCancelButton={linkedAccounts.length > 0}
                                />
                            </Paper>
                        )}
                    </Box>
                )}

                {/* EXISTING DELETE ECOPART DIALOG */}
                <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                    <DialogTitle>Delete Account?</DialogTitle>
                    <DialogContent>
                        <DialogContentText>Are you sure you want to delete your account? This action cannot be undone.</DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
                        <Button onClick={handleConfirmDelete} color="error" autoFocus>Delete</Button>
                    </DialogActions>
                </Dialog>

                {/* NEW UNLINK CONFIRMATION DIALOG */}
                <Dialog open={openUnlinkDialog} onClose={() => setOpenUnlinkDialog(false)}>
                    <DialogTitle>Disconnect EcoTaxa Account?</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Are you sure you want to disconnect this EcoTaxa account? You will need to log in again to access its data.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenUnlinkDialog(false)}>Cancel</Button>
                        <Button onClick={handleConfirmUnlink} color="primary" autoFocus>Disconnect</Button>
                    </DialogActions>
                </Dialog>

            </Container>
        </MainLayout>
    );
}