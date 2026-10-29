import { Typography } from "@mui/material";

import type { ProjectStatsRawBackup } from "../../api/projectStats.api";
import StatWarning, { StatWarnings } from "./StatWarning";
import StatsSection from "./StatsSection";
import { formatElapsed, formatUtcDay, pluralize } from "./statsFormat";

/** When the raw project was last backed up, and whether samples were imported since. */
export default function ProjectRawBackupSection({ rawBackup, projectId }: { rawBackup: ProjectStatsRawBackup; projectId: number }) {
    const { last_backup_utc_date_time: last, nb_samples_not_backed_up: missing } = rawBackup;
    return (
        <StatsSection
            title="Raw backup"
            warnings={missing > 0 && (
                <StatWarnings>
                    <StatWarning
                        label="Samples imported without raw backup"
                        to={`/projects/${projectId}/backup`}
                        hint={last
                            ? `${pluralize(missing, "sample")} imported since the last backup: run a backup from the BACKUP tab.`
                            : "The raw project has never been backed up: run a backup from the BACKUP tab."}
                    />
                </StatWarnings>
            )}
        >
            <Typography variant="body1">
                Last raw backup : <strong>{last ? `${formatElapsed(last)} ago` : "never"}</strong>
                {last && <Typography component="span" variant="body2" color="text.secondary"> ({formatUtcDay(last)})</Typography>}
            </Typography>
        </StatsSection>
    );
}
