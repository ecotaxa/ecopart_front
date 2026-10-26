import { Box, Typography } from "@mui/material";
import InfoTooltip from "./InfoTooltip";

/**
 * What a user without privilege on a project may do at each privacy status, in the
 * order the project goes through them (see the access table in projects/utils/projectAccess.ts).
 */
const PRIVACY_STATUS_DEFINITIONS: readonly { label: string; definition: string }[] = [
    {
        label: "Private",
        definition: "the user can see the project's metadata and stats, enough to request access, but nothing else (no sample list, no QC graphs, no export). A project with no dated sample stays private.",
    },
    {
        label: "Visible",
        definition: "the user can also see the figures, meaning the sample list, sample details and QC graphs. Still no export.",
    },
    {
        label: "Public",
        definition: "the user can also download the binned particle export.",
    },
    {
        label: "Open",
        definition: "the user can also download the EcoTaxa classification data. This is the final status, reached once all three delays have passed.",
    },
];

const privacyStatusInfoContent = (
    <Box>
        {PRIVACY_STATUS_DEFINITIONS.map(({ label, definition }, index) => (
            <Typography
                key={label}
                variant="caption"
                component="p"
                sx={{ mb: index < PRIVACY_STATUS_DEFINITIONS.length - 1 ? 1 : 0 }}
            >
                <strong>{label}</strong>: {definition}
            </Typography>
        ))}
    </Box>
);

/** ⓘ info point defining the four project privacy statuses. */
export default function PrivacyStatusInfo() {
    return <InfoTooltip title={privacyStatusInfoContent} />;
}
