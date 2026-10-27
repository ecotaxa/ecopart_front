import React from "react";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import CloudIcon from "@mui/icons-material/Cloud";

import SectionCard from "@/shared/components/SectionCard";
import { ecotaxaColors } from "@/theme";
import { extractErrorMessage } from "@/shared/utils/errorMessage";
import { useProjectStats } from "../hooks/useProjectStats";
import ProjectStatsCounters from "./stats/ProjectStatsCounters";
import ProjectPrivacyTimeline from "./stats/ProjectPrivacyTimeline";
import ProjectRawBackupSection from "./stats/ProjectRawBackupSection";
import ProjectSamplesMap from "./stats/ProjectSamplesMap";
import ProjectSamplesSummary from "./stats/ProjectSamplesSummary";
import ProjectEcoTaxaSection from "./stats/ProjectEcoTaxaSection";

interface StatsInfoRowProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
}

const StatsInfoRow: React.FC<StatsInfoRowProps> = ({ icon, title, description, actionLabel, onAction }) => (
    <Box
        sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            p: 2.5,
            border: "1px solid",
            borderColor: ecotaxaColors.stone[200],
            borderRadius: 1,
        }}
    >
        <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ color: "primary.main", display: "flex", mt: 0.5 }}>{icon}</Box>
            <Box>
                <Typography variant="body1">{title}</Typography>
                <Typography variant="body2" color="text.secondary">
                    {description}
                </Typography>
            </Box>
        </Stack>
        <Button variant="outlined" color="primary" onClick={onAction} sx={{ flexShrink: 0, fontWeight: "bold" }}>
            {actionLabel}
        </Button>
    </Box>
);

interface ProjectStatsTabProps {
    projectId: number;
    /** Whether the project already has an EcoTaxa project linked (hides the link call-to-action). */
    ecoTaxaLinked: boolean;
    /** Omitted when the user may not import: the import card is hidden. */
    onImportData?: () => void;
    /** Omitted when the user may not manage the project: the EcoTaxa link card is hidden. */
    onLinkProject?: () => void;
    /** Shown above everything, e.g. why the project data is hidden. */
    notice?: React.ReactNode;
}

/**
 * The STATS tab of a project (`GET /projects/:id/stats`): headline counters and the
 * privacy timeline always; the raw backup, the sample map, the sample types and
 * ranges and the EcoTaxa classification once the project has samples. A project
 * without sample gets the import card instead, and an unlinked one the EcoTaxa
 * link card, each offered only to who can act on it.
 */
export const ProjectStatsTab: React.FC<ProjectStatsTabProps> = ({ projectId, ecoTaxaLinked, onImportData, onLinkProject, notice }) => {
    const { data: stats, isPending, isError, error } = useProjectStats(projectId);
    const hasSamples = stats !== undefined && stats.counts.samples > 0;
    const showImportCard = onImportData !== undefined && !isPending && !hasSamples;
    const showLinkCard = !ecoTaxaLinked && onLinkProject !== undefined;

    return (
        <SectionCard>
            <Typography variant="h6" component="h2" sx={{ mb: 3 }}>Stats</Typography>
            <Stack spacing={5}>
                {notice}
                {(showImportCard || showLinkCard) && (
                    <Stack spacing={2}>
                        {showImportCard && (
                            <StatsInfoRow
                                icon={<DownloadIcon />}
                                title="Import data to get started."
                                description="You can import UVP data, and particles data in the import tab of your project."
                                actionLabel="IMPORT DATA"
                                onAction={onImportData}
                            />
                        )}
                        {showLinkCard && (
                            <StatsInfoRow
                                icon={<CloudIcon />}
                                title="Your project is not linked to an EcoTaxa project. Please link it to an existing or new EcoTaxa project."
                                description="You will then be able to import images to EcoTaxa from EcoPart and classify them in EcoTaxa."
                                actionLabel="LINK PROJECT"
                                onAction={onLinkProject}
                            />
                        )}
                    </Stack>
                )}

                {isError ? (
                    <Alert severity="error">{extractErrorMessage(error, "The project statistics could not be loaded.")}</Alert>
                ) : isPending ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                        <CircularProgress aria-label="Loading statistics" />
                    </Box>
                ) : (
                    <>
                        <ProjectStatsCounters counts={stats.counts} />
                        <ProjectPrivacyTimeline privacy={stats.privacy} />
                        {hasSamples ? (
                            <>
                                {stats.raw_backup && <ProjectRawBackupSection rawBackup={stats.raw_backup} />}
                                <ProjectSamplesMap map={stats.map} />
                                <ProjectSamplesSummary samples={stats.samples} />
                                {stats.ecotaxa.linked && <ProjectEcoTaxaSection ecotaxa={stats.ecotaxa} />}
                            </>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                No sample imported yet: the statistics will show once the project has data.
                            </Typography>
                        )}
                    </>
                )}
            </Stack>
        </SectionCard>
    );
};
