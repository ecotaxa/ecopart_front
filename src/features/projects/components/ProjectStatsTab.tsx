import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import CloudIcon from "@mui/icons-material/Cloud";

import SectionCard from "@/shared/components/SectionCard";
import { ecotaxaColors } from "@/theme";

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
    /** Whether the project already has an EcoTaxa project linked (hides the link call-to-action). */
    ecoTaxaLinked: boolean;
    /** Omitted when the user may not import: the import card is hidden. */
    onImportData?: () => void;
    /** Omitted when the user may not manage the project: the EcoTaxa link card is hidden. */
    onLinkProject?: () => void;
    /** Shown above the cards, e.g. why the project data is hidden. */
    notice?: React.ReactNode;
}

/**
 * Empty-state cards of the STATS tab: the two things a fresh project needs
 * before statistics mean anything, each offered only to who can act on it. The
 * EcoTaxa card only shows while the project is still unlinked.
 */
export const ProjectStatsTab: React.FC<ProjectStatsTabProps> = ({ ecoTaxaLinked, onImportData, onLinkProject, notice }) => {
    const showLinkCard = !ecoTaxaLinked && onLinkProject !== undefined;
    return (
        <SectionCard>
            <Stack spacing={2}>
                {notice}
                {onImportData && (
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
                {!notice && !onImportData && !showLinkCard && (
                    <Typography variant="body2" color="text.secondary">
                        No statistics to show for this project yet.
                    </Typography>
                )}
            </Stack>
        </SectionCard>
    );
};
