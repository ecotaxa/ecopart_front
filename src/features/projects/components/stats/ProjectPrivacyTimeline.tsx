import { Fragment } from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

import { PROJECT_PRIVACY_STATUSES, privacyLabel, type ProjectPrivacyStatus } from "../../utils/projectAccess";
import type { ProjectStatsPrivacy } from "../../api/projectStats.api";
import StatsSection from "./StatsSection";
import { formatUtcDay } from "./statsFormat";

const DATE_LABELS: Record<ProjectPrivacyStatus, string> = {
    private: "Oldest sample",
    visible: "Visibility date",
    public: "Public date",
    open: "Open date",
};

const dateOf = (privacy: ProjectStatsPrivacy, status: ProjectPrivacyStatus): string | null => {
    switch (status) {
        case "private": return privacy.oldest_sample_utc_date_time;
        case "visible": return privacy.visible_utc_date_time;
        case "public": return privacy.public_utc_date_time;
        case "open": return privacy.open_utc_date_time;
    }
};

/**
 * The privacy timeline of the project: the four statuses, the reached ones ticked,
 * each with the date it is (or will be) reached, counted from the oldest sample.
 */
export default function ProjectPrivacyTimeline({ privacy }: { privacy: ProjectStatsPrivacy }) {
    const currentIndex = PROJECT_PRIVACY_STATUSES.indexOf(privacy.status);

    return (
        <StatsSection title="Data privacy status">
            <Stack direction="row" sx={{ alignItems: "center", gap: 2, mb: 2 }}>
                {PROJECT_PRIVACY_STATUSES.map((status, index) => {
                    const reached = index <= currentIndex;
                    return (
                        <Fragment key={status}>
                            {index > 0 && <Divider sx={{ flexGrow: 1 }} />}
                            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }} aria-current={index === currentIndex ? "step" : undefined}>
                                {reached
                                    ? <CheckCircleIcon color="primary" fontSize="small" aria-hidden="true" />
                                    : <CancelIcon fontSize="small" sx={{ color: "text.disabled" }} aria-hidden="true" />}
                                <Typography variant="body2" fontWeight={index === currentIndex ? "bold" : "normal"} color={reached ? "text.primary" : "text.secondary"}>
                                    {privacyLabel(status)}
                                </Typography>
                            </Stack>
                        </Fragment>
                    );
                })}
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
                {PROJECT_PRIVACY_STATUSES.map((status) => (
                    <Box key={status}>
                        <Typography variant="body2" color="text.secondary">{DATE_LABELS[status]} :</Typography>
                        <Typography variant="body1" fontWeight="bold">{formatUtcDay(dateOf(privacy, status))}</Typography>
                    </Box>
                ))}
            </Stack>
            {privacy.oldest_sample_utc_date_time === null && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    No sample yet: the delays have not started.
                </Typography>
            )}
        </StatsSection>
    );
}
