import { Fragment } from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

import { PROJECT_PRIVACY_STATUSES, privacyLabel, type ProjectPrivacyStatus } from "../utils/projectAccess";
import type { PrivacyDates } from "../utils/privacyMilestones";
import { formatUtcDay } from "./stats/statsFormat";

const DATE_LABELS: Record<ProjectPrivacyStatus, string> = {
    private: "Oldest sample",
    visible: "Visibility date",
    public: "Public date",
    open: "Open date",
};

interface PrivacyTimelineProps {
    status: ProjectPrivacyStatus;
    /** The date of each status; without it (project creation) only the steps are shown. */
    dates?: PrivacyDates;
}

/**
 * The four privacy statuses, the reached ones ticked and the current one in bold, each
 * with the date it is (or will be) reached. Shared by the STATS and SECURITY tabs.
 */
export default function PrivacyTimeline({ status, dates }: PrivacyTimelineProps) {
    const currentIndex = PROJECT_PRIVACY_STATUSES.indexOf(status);

    return (
        <Box>
            <Stack direction="row" sx={{ alignItems: "center", gap: 2, mb: dates ? 2 : 0 }}>
                {PROJECT_PRIVACY_STATUSES.map((step, index) => {
                    const reached = index <= currentIndex;
                    return (
                        <Fragment key={step}>
                            {index > 0 && <Divider sx={{ flexGrow: 1 }} />}
                            <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }} aria-current={index === currentIndex ? "step" : undefined}>
                                {reached
                                    ? <CheckCircleIcon color="primary" fontSize="small" aria-hidden="true" />
                                    : <CancelIcon fontSize="small" sx={{ color: "text.disabled" }} aria-hidden="true" />}
                                <Typography variant="body2" fontWeight={index === currentIndex ? "bold" : "normal"} color={reached ? "text.primary" : "text.secondary"}>
                                    {privacyLabel(step)}
                                </Typography>
                            </Stack>
                        </Fragment>
                    );
                })}
            </Stack>
            {dates && (
                <>
                    <Stack direction="row" sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
                        {PROJECT_PRIVACY_STATUSES.map((step) => (
                            <Box key={step}>
                                <Typography variant="body2" color="text.secondary">{DATE_LABELS[step]} :</Typography>
                                <Typography variant="body1" fontWeight="bold">{formatUtcDay(dates[step])}</Typography>
                            </Box>
                        ))}
                    </Stack>
                    {dates.private === null && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                            No sample yet: the delays have not started.
                        </Typography>
                    )}
                </>
            )}
        </Box>
    );
}
