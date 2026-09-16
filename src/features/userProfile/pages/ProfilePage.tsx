import { Alert, Box, CircularProgress, Container, Tab, Tabs, Typography } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import CloudIcon from "@mui/icons-material/Cloud";

import { useProfilePage } from "../hooks/useProfilePage";
import { EcopartAccountTab } from "../components/EcopartAccountTab";
import { EcoTaxaAccountsTab } from "../components/EcoTaxaAccountsTab";

/**
 * Settings page (`/settings/:userId?/:tabName?`): the EcoPart account (profile,
 * password, deletion) and the linked EcoTaxa accounts. All the state lives in
 * `useProfilePage`; each tab is its own component.
 */
export default function ProfilePage() {
    const page = useProfilePage();
    const { loadingUser, loadError, tabValue, handleTabChange } = page;

    if (loadingUser) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="sm" sx={{ mt: 4, mb: 8, textAlign: "left" }}>

            <Typography variant="h4" sx={{ mb: 2 }}>Settings</Typography>

            {loadError && (
                <Alert severity="error" sx={{ mb: 3 }}>{loadError}</Alert>
            )}

            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab icon={<PersonIcon />} iconPosition="start" label="ECOPART ACCOUNT" />
                    <Tab icon={<CloudIcon />} iconPosition="start" label="ECOTAXA ACCOUNTS" />
                </Tabs>
            </Box>

            {tabValue === 0 && <EcopartAccountTab page={page} />}
            {tabValue === 1 && <EcoTaxaAccountsTab page={page} />}

        </Container>
    );
}
