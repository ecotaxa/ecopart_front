import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    FormControlLabel,
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

import InfoTooltip from "@/shared/components/InfoTooltip";
import { PasswordInput } from "@/shared/components/PasswordInput";
import { useOrganisations } from "@/shared/api/referenceData.hooks";
import { isNonEmpty } from "@/shared/utils/validation";
import { VALIDATION_MESSAGES } from "@/shared/utils/validation/messages";
import type { useProfilePage } from "../hooks/useProfilePage";

type ProfilePageState = ReturnType<typeof useProfilePage>;

interface EcopartAccountTabProps {
    page: ProfilePageState;
}

/**
 * ECOPART ACCOUNT tab of the settings page: the profile form, the password
 * change (own account only) and the account deletion, plus the delete dialog.
 */
export function EcopartAccountTab({ page }: EcopartAccountTabProps) {
    const { currentUser, user, isEditingSelf, countryOptions, navigate, profile, password, deleteAccount } = page;
    const { data: organisationOptions = [], isPending: loadingOrganisations } = useOrganisations();

    return (
        <>
            <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h6">
                        {isEditingSelf ? "Profile" : `Edit user #${user?.user_id}`}
                    </Typography>
                    {currentUser?.is_admin && (
                        <Button variant="contained" color="primary" size="small" startIcon={<AdminPanelSettingsIcon />} onClick={() => navigate('/admin')}>ADMIN DASHBOARD</Button>
                    )}
                </Stack>
                <Divider sx={{ mb: 3 }} />
                {profile.message && <Alert severity={profile.message.type} sx={{ mb: 2 }}>{profile.message.text}</Alert>}
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label="First name*"
                            value={profile.firstName}
                            onChange={(e) => profile.setFirstName(e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label="Last name*"
                            value={profile.lastName}
                            onChange={(e) => profile.setLastName(e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth
                            label="Email"
                            value={profile.email}
                            disabled
                            helperText="Contact admin to change email"
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        {/* Same organisation list as the sign-up form (free text still allowed). */}
                        <Autocomplete
                            freeSolo
                            fullWidth
                            options={organisationOptions}
                            value={profile.organisation}
                            onInputChange={(_, val) => profile.setOrganisation(val)}
                            loading={loadingOrganisations}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Organisation*"
                                    slotProps={{
                                        input: {
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {loadingOrganisations ? <CircularProgress size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        },
                                    }}
                                />
                            )}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Autocomplete
                            fullWidth
                            options={countryOptions}
                            getOptionLabel={(o) => o.name}
                            isOptionEqualToValue={(option, value) => option.code === value.code}
                            value={countryOptions.find((c) => c.code === profile.countryCode) || null}
                            onChange={(_, val) => profile.setCountryCode(val ? val.code : "")}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Country*"
                                    error={!profile.countryCode}
                                    helperText={!profile.countryCode ? "Please select a country" : ""}
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
                            value={profile.plannedUsage}
                            onChange={(e) => profile.setPlannedUsage(e.target.value)}
                            helperText="Describe briefly how you plan to use the data."
                        />
                    </Grid>
                    {currentUser?.is_admin && (
                        <Grid size={{ xs: 12 }}>
                            <FormControlLabel
                                control={<Checkbox checked={profile.isAdmin} onChange={(e) => profile.setIsAdmin(e.target.checked)} />}
                                label={
                                    <Typography variant="body1" component="span">
                                        Administrator
                                        <InfoTooltip
                                            title={
                                                <Typography variant="caption" component="p">
                                                    Grants full administrator access: manage all users, projects and tasks.
                                                    This option is only visible to administrators and takes effect after you save.
                                                </Typography>
                                            }
                                        />
                                    </Typography>
                                }
                            />
                        </Grid>
                    )}
                </Grid>
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                    <Button variant="contained" onClick={profile.save} disabled={profile.saving || !profile.canSave}>{profile.saving ? "Saving..." : "SAVE"}</Button>
                    <Button variant="outlined" onClick={profile.cancel} disabled={profile.saving}>CANCEL</Button>
                </Box>
            </Paper>

            {/* Password change requires the account's current password, so it
                is only available when editing your own account. */}
            {isEditingSelf && (
                <>
                    <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
                        Security
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
                        <Typography variant="h6" gutterBottom>
                            Change password
                        </Typography>
                        <Divider sx={{ mb: 3 }} />

                        {password.message && (
                            <Alert severity={password.message.type} sx={{ mb: 2 }}>
                                {password.message.text}
                            </Alert>
                        )}

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12 }}>
                                <PasswordInput
                                    fullWidth
                                    label="Current password"
                                    autoComplete="current-password"
                                    value={password.currentPassword}
                                    onChange={(e) => password.setCurrentPassword(e.target.value)}
                                />
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <PasswordInput
                                    fullWidth
                                    label="New password"
                                    autoComplete="new-password"
                                    value={password.newPassword}
                                    onChange={(e) => password.setNewPassword(e.target.value)}
                                    error={isNonEmpty(password.newPassword) && !password.isValid}
                                    helperText={
                                        isNonEmpty(password.newPassword) && !password.isValid
                                            ? VALIDATION_MESSAGES.PASSWORD_REQ
                                            : " "
                                    }
                                />
                            </Grid>

                            <Grid size={{ xs: 12 }}>
                                <PasswordInput
                                    fullWidth
                                    label="Re-type new password"
                                    autoComplete="new-password"
                                    value={password.confirmPassword}
                                    onChange={(e) => password.setConfirmPassword(e.target.value)}
                                    error={isNonEmpty(password.confirmPassword) && !password.matches}
                                    helperText={
                                        isNonEmpty(password.confirmPassword) && !password.matches
                                            ? VALIDATION_MESSAGES.PASSWORD_MISMATCH
                                            : " "
                                    }
                                />
                            </Grid>
                        </Grid>

                        <Box sx={{ mt: 3 }}>
                            <Button
                                variant="outlined"
                                onClick={password.change}
                                disabled={!password.canSave || password.saving}
                            >
                                {password.saving ? "Changing..." : "CHANGE"}
                            </Button>
                        </Box>
                    </Paper>
                </>
            )}

            {/* --- SECTION: DELETE ACCOUNT --- */}
            <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Delete account
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {deleteAccount.error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {deleteAccount.error}
                    </Alert>
                )}

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {isEditingSelf
                        ? "Your account will be deactivated. You will not be able to connect to EcoPart anymore. " +
                          "Please transfer access permissions for any projects you manage before deleting your account. " +
                          "To completely delete your account, please send an email to contact@ecopart.fr"
                        : "This account will be deactivated and the user will no longer be able to connect to EcoPart. " +
                          "Please transfer access permissions for any projects they manage first. " +
                          "To completely delete the account, please send an email to contact@ecopart.fr"}
                </Typography>

                <Button
                    variant="outlined"
                    color="error"
                    sx={{ mt: 1 }}
                    onClick={deleteAccount.open}
                >
                    DELETE
                </Button>
            </Paper>

            <Dialog open={deleteAccount.dialogOpen} onClose={deleteAccount.close}>
                <DialogTitle>Delete Account?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {isEditingSelf
                            ? "Are you sure you want to delete your account? This action cannot be undone."
                            : `Are you sure you want to delete the account of ${user?.first_name ?? ""} ${user?.last_name ?? ""} (#${user?.user_id})? This action cannot be undone.`}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={deleteAccount.close}>Cancel</Button>
                    <Button onClick={deleteAccount.confirm} color="error" autoFocus>Delete</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
