import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Box,
    Container,
    Typography,
    Button,
    Tabs,
    Tab,
} from "@mui/material";
import MainLayout from "@/app/layouts/MainLayout";

// Import your tabs
import { ProjectMetadataTab } from "../components/ProjectMetadataTab";

// Icons based on your mockup
import BarChartIcon from "@mui/icons-material/BarChart";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";
import CloudIcon from "@mui/icons-material/Cloud";
import DownloadIcon from "@mui/icons-material/Download";
import SyncIcon from "@mui/icons-material/Sync";
import LockIcon from "@mui/icons-material/Lock";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BackupIcon from "@mui/icons-material/Backup";

export default function ProjectDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Parse the route param once.
    // If parsing fails, we keep null so TypeScript and runtime are both explicit.
    const parsedProjectId = id ? Number.parseInt(id, 10) : null;
    const projectId = parsedProjectId !== null && !Number.isNaN(parsedProjectId) ? parsedProjectId : null;

    // State to manage the active tab (0 = Stats, 1 = Metadata, etc.)
    // Based on mockup, Metadata is selected by default, so we set it to 1
    const [currentTab, setCurrentTab] = useState(1);

    if (projectId === null) {
        return (
            <MainLayout>
                <Container sx={{ mt: 4 }}>
                    <Typography variant="h4" color="error">
                        Invalid Project ID
                    </Typography>
                </Container>
            </MainLayout>
        );
    }

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    return (
        <MainLayout>
            {/* The main container is "lg" to allow future data tables to be wide */}
            <Container
                maxWidth={false} // Désactive les paliers par défaut
                sx={{
                    maxWidth: {
                        xs: '100%',
                        md: '900px',
                        lg: '1100px' // Ta valeur entre md et lg
                    },
                    mx: 'auto', // Centre le container car maxWidth={false} enlève le centrage
                    mt: 4,
                    mb: 8
                }}
            >

                {/* TOP HEADER SECTION (Matches Mockup) */}
                <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Box>
                        <Typography variant="h4" gutterBottom>
                            Project
                        </Typography>
                        <Typography variant="h5" color="text.secondary">
                            Project Details [{projectId}]
                        </Typography>
                    </Box>

                    <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => navigate(`/explore?projects=${projectId}`)}
                    >
                        EXPLORE
                    </Button>
                </Box>

                {/* TABS NAVIGATION */}
                <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                    <Tabs
                        value={currentTab}
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        <Tab icon={<BarChartIcon />} iconPosition="start" label="STATS" />
                        <Tab icon={<TextSnippetIcon />} iconPosition="start" label="METADATA" />
                        <Tab icon={<CloudIcon />} iconPosition="start" label="DATA" />
                        <Tab icon={<DownloadIcon />} iconPosition="start" label="IMPORT" />
                        <Tab icon={<SyncIcon />} iconPosition="start" label="UPDATE" />
                        <Tab icon={<LockIcon />} iconPosition="start" label="SECURITY" />
                        <Tab icon={<AssignmentIcon />} iconPosition="start" label="TASKS" />
                        <Tab icon={<BackupIcon />} iconPosition="start" label="BACKUP" />
                    </Tabs>
                </Box>

                {/* TAB CONTENT RENDERER */}
                {/* We removed the <Paper> wrapper here because ProjectMetadataTab handles its own <Paper> and constraints */}
                <Box sx={{ minHeight: 400, borderRadius: 2 }}>

                    {currentTab === 0 && (
                        <Box sx={{ p: 4, textAlign: "center" }}>
                            <Typography variant="h6" color="text.secondary">
                                Stats Tab (Coming Soon)
                            </Typography>
                        </Box>
                    )}

                    {currentTab === 1 && <ProjectMetadataTab projectId={projectId} />}

                    {currentTab === 2 && (
                        <Box sx={{ p: 4, textAlign: "center" }}>
                            <Typography variant="h6" color="text.secondary">
                                Data Tab (Coming Soon)
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Container>
        </MainLayout>
    );
}