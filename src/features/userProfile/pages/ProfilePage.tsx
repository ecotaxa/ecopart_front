import { Alert, Box, CircularProgress, Container, Tab, Tabs, Typography } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import CloudIcon from "@mui/icons-material/Cloud";

import { useParams } from "react-router-dom";

import { routeUserIdFromParam, useProfilePage } from "../hooks/useProfilePage";
import { EcopartAccountTab } from "../components/EcopartAccountTab";
import { EcoTaxaAccountsTab } from "../components/EcoTaxaAccountsTab";
import { pageContainerSx, pageTabsSx } from "@/shared/layout/pageLayout";

/**
 * Settings page (`/settings/:userId?/:tabName?`): the EcoPart account (profile,
 * password, deletion) and the linked EcoTaxa accounts. All the state lives in
 * `useProfilePage`; each tab is its own component.
 *
 * The route element stays mounted when only the id in the URL changes (an admin
 * going from one account to another), so the page is keyed on the edited
 * account: every form field, feedback message and dialog starts afresh instead
 * of carrying over from the previous account. Switching tabs keeps the key
 * (except once from the legacy id-less URL, whose tab links add the id).
 */
export default function ProfilePage() {
    const { userId } = useParams<{ userId?: string }>();
    return <ProfilePageContent key={routeUserIdFromParam(userId) ?? "self"} />;
}

function ProfilePageContent() {
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
        <Container maxWidth="sm" sx={{ ...pageContainerSx, textAlign: "left" }}>

            <Typography variant="h4" sx={{ mb: 2 }}>Settings</Typography>

            {loadError && (
                <Alert severity="error" sx={{ mb: 3 }}>{loadError}</Alert>
            )}

            <Box sx={pageTabsSx}>
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
