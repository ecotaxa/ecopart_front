import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Box,
    Container,
    Typography,
    Tabs,
    Tab,
} from "@mui/material";

import StarIcon from "@mui/icons-material/Star";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ListAltIcon from "@mui/icons-material/ListAlt";
import SyncIcon from "@mui/icons-material/Sync";

import MainLayout from "@/app/layouts/MainLayout";
import AdminTasksTab from "../components/AdminTasksTab";
import AdminUsersTab from "../components/AdminUsersTab";

/**
 * AdminPage — the EcoPart administration console (route `/admin`, admins only).
 *
 * Mirrors the tabbed layout of ProjectDetailsPage. Only the TASKS panel is
 * implemented for now; the other tabs render a "coming soon" placeholder. The
 * active tab is driven by the `:tabName` route param so tabs are linkable.
 */
export default function AdminPage() {
    const { tabName } = useParams<{ tabName?: string }>();
    const navigate = useNavigate();

    const tabDefinitions = useMemo(() => ([
        { slug: "quick-access", label: "QUICK ACCESS", icon: <StarIcon /> },
        { slug: "users", label: "USERS", icon: <PeopleAltIcon /> },
        { slug: "projects", label: "PROJECTS", icon: <ViewModuleIcon /> },
        { slug: "tasks", label: "TASKS", icon: <ListAltIcon /> },
        { slug: "updates", label: "UPDATES", icon: <SyncIcon /> },
    ]), []);

    const tabIndexFromSlug = tabName
        ? tabDefinitions.findIndex((tab) => tab.slug === tabName)
        : tabDefinitions.findIndex((tab) => tab.slug === "tasks");
    const currentTab = tabIndexFromSlug >= 0 ? tabIndexFromSlug : tabDefinitions.findIndex((tab) => tab.slug === "tasks");

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        const nextSlug = tabDefinitions[newValue]?.slug ?? "tasks";
        navigate(`/admin/${nextSlug}`);
    };

    const renderComingSoonTab = (label: string) => (
        <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary">
                {label} (Coming Soon)
            </Typography>
        </Box>
    );

    const currentSlug = tabDefinitions[currentTab]?.slug;

    return (
        <MainLayout>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" gutterBottom>
                        EcoPart administration
                    </Typography>
                </Box>

                {/* TABS NAVIGATION */}
                <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                    <Tabs
                        value={currentTab}
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        {tabDefinitions.map((tab, index) => (
                            <Tab
                                key={tab.slug}
                                value={index}
                                icon={tab.icon}
                                iconPosition="start"
                                label={tab.label}
                            />
                        ))}
                    </Tabs>
                </Box>

                {/* TAB CONTENT */}
                <Box sx={{ minHeight: 400 }}>
                    {currentSlug === "users" && <AdminUsersTab />}
                    {currentSlug === "tasks" && <AdminTasksTab />}
                    {currentSlug !== "users" && currentSlug !== "tasks" &&
                        renderComingSoonTab(tabDefinitions[currentTab]?.label ?? "")}
                </Box>
            </Container>
        </MainLayout>
    );
}
