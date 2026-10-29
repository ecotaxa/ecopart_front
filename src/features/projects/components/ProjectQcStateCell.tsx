import { Box, Link, Stack, Tooltip, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import type { ProjectQcStateLabel, ProjectQcWarning } from "../api/projects.api";
import { qcWarningLabel } from "../utils/qcWarnings";
import { pluralize } from "./stats/statsFormat";

interface ProjectQcStateCellProps {
    projectId: number;
    qcState?: ProjectQcStateLabel;
    warnings?: ProjectQcWarning[];
}

/**
 * The QC state column of the project lists: the warnings of the project STATS tab,
 * as a count linking to that tab with their list in a tooltip, a check when there
 * is none, "-" for a project without sample or whose state could not be read.
 */
export default function ProjectQcStateCell({ projectId, qcState, warnings = [] }: ProjectQcStateCellProps) {
    if (qcState === "ok") {
        return (
            <Tooltip title="No warning in the project statistics">
                <CheckCircleIcon color="success" aria-label="No QC warning" />
            </Tooltip>
        );
    }
    if (qcState === "warning") {
        return (
            <Tooltip
                title={
                    <Box>
                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                            {warnings.map((warning) => (
                                <li key={warning.code}>{qcWarningLabel(warning)}</li>
                            ))}
                        </Box>
                        <Typography variant="caption" component="p" sx={{ mt: 0.5 }}>Open the STATS tab to act on them.</Typography>
                    </Box>
                }
            >
                <Link
                    component={RouterLink}
                    to={`/projects/${projectId}/stats`}
                    underline="hover"
                    color="inherit"
                    sx={{ display: "flex", alignItems: "center", height: "100%" }}
                >
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "warning.main" }}>
                        <WarningAmberIcon fontSize="small" aria-hidden="true" />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {pluralize(warnings.length, "warning")}
                        </Typography>
                    </Stack>
                </Link>
            </Tooltip>
        );
    }
    return (
        <Typography variant="caption" color="text.secondary">
            -
        </Typography>
    );
}
