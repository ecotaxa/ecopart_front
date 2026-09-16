import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ReplayIcon from "@mui/icons-material/Replay";
import AddIcon from "@mui/icons-material/Add";
import LogoutIcon from "@mui/icons-material/Logout";

import { ecotaxaColors } from "@/theme";
import type { EcoTaxaAccountLink } from "@/shared/api/ecotaxa.api";
import type { useProfilePage } from "../hooks/useProfilePage";
import { EcoTaxaLoginForm } from "./EcoTaxaLoginForm";

type ProfilePageState = ReturnType<typeof useProfilePage>;

interface EcoTaxaAccountsTabProps {
    page: ProfilePageState;
}

const getDaysLeft = (expirationDate: string) => {
    if (!expirationDate) return 0;
    const diffTime = new Date(expirationDate).getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
};

const getEcoTaxaAccountLabel = (account: EcoTaxaAccountLink) =>
    account.ecotaxa_user_email || account.ecotaxa_user_login || account.ecotaxa_user_name;

// An account is expired once its expiration date is in the past.
const isExpired = (expirationDate: string) => {
    if (!expirationDate) return false;
    return new Date(expirationDate).getTime() <= Date.now();
};

/**
 * ECOTAXA ACCOUNTS tab of the settings page: the linked accounts (with
 * reconnect / disconnect), the link form and the disconnect dialog.
 */
export function EcoTaxaAccountsTab({ page }: EcoTaxaAccountsTabProps) {
    const { user, ecoTaxa } = page;

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Accounts on EcoTaxa instances</Typography>

            {/* CONNECTED ACCOUNTS — always visible (the form appears below, never hides them) */}
            <Stack spacing={2} sx={{ mt: 2 }}>
                {ecoTaxa.linkedAccounts.map((account) => {
                    const expired = isExpired(account.ecotaxa_expiration_date);
                    return (
                        <Paper
                            key={account.ecotaxa_account_id}
                            variant="outlined"
                            sx={{
                                p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                backgroundColor: expired ? ecotaxaColors.danger[50] : ecotaxaColors.secondblue[50],
                                borderColor: expired ? 'error.light' : ecotaxaColors.secondblue[200]
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {expired
                                    ? <ErrorOutlineIcon sx={{ fontSize: 40, color: 'error.main' }} />
                                    : <CheckCircleOutlineIcon sx={{ fontSize: 40, color: 'text.secondary' }} />}
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        {getEcoTaxaAccountLabel(account)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Instance: {account.ecotaxa_account_instance_name}
                                    </Typography>
                                    {expired
                                        ? <Chip label="Expired" color="error" size="small" variant="outlined" sx={{ mt: 0.5 }} />
                                        : <Typography variant="body2" color="text.secondary">
                                            {getDaysLeft(account.ecotaxa_expiration_date)} days left
                                        </Typography>}
                                </Box>
                            </Box>

                            <Stack direction="row" spacing={1} alignItems="center">
                                {expired && (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        startIcon={<ReplayIcon />}
                                        disabled={ecoTaxa.reconnecting === account.ecotaxa_account_id}
                                        onClick={() => ecoTaxa.reconnect(account)}
                                    >
                                        {ecoTaxa.reconnecting === account.ecotaxa_account_id ? "Removing…" : "Reconnect"}
                                    </Button>
                                )}
                                <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => ecoTaxa.requestUnlink(account.ecotaxa_account_id)}
                                    aria-label="Disconnect EcoTaxa account"
                                >
                                    <LogoutIcon />
                                </IconButton>
                            </Stack>
                        </Paper>
                    );
                })}

                {/* Add-account trigger — hidden while the form is open */}
                {!ecoTaxa.showLinkForm && (
                    <Button
                        variant="outlined" color="inherit" fullWidth startIcon={<AddIcon />}
                        onClick={ecoTaxa.openLinkForm}
                        sx={{ justifyContent: 'flex-start', p: 2, textTransform: 'none', borderColor: 'divider', color: 'text.primary' }}
                    >
                        Connect to another account
                    </Button>
                )}
            </Stack>

            {/* FORM — appears below the list, seeded for reconnect when applicable */}
            {ecoTaxa.showLinkForm && user && (
                <Paper variant="outlined" sx={{ p: 4, mt: 2 }}>
                    <EcoTaxaLoginForm
                        key={ecoTaxa.reconnectTarget?.email ?? 'new'}
                        userId={user.user_id}
                        onSuccess={ecoTaxa.onLoginSuccess}
                        onCancel={ecoTaxa.closeLinkForm}
                        showCancelButton={ecoTaxa.linkedAccounts.length > 0}
                        initialEmail={ecoTaxa.reconnectTarget?.email}
                        initialInstanceId={ecoTaxa.reconnectTarget?.instanceId}
                    />
                </Paper>
            )}

            {/* UNLINK CONFIRMATION DIALOG */}
            <Dialog open={ecoTaxa.unlinkDialogOpen} onClose={ecoTaxa.cancelUnlink}>
                <DialogTitle>Disconnect EcoTaxa Account?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to disconnect this EcoTaxa account? You will need to log in again to access its data.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={ecoTaxa.cancelUnlink}>Cancel</Button>
                    <Button onClick={ecoTaxa.confirmUnlink} color="primary" autoFocus>Disconnect</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
