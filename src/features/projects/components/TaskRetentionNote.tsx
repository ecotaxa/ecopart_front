import { Stack, Typography, type SxProps, type Theme } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { EXPORT_ARCHIVE_RETENTION_NOTE, taskLogRetentionNote } from "../utils/taskColumns";
import { useTaskLogRetentionDays } from "../hooks/useTaskLogRetentionDays";

/** How long the server keeps task logs and export archives, shown above the task lists. */
export default function TaskRetentionNote({ sx }: { sx?: SxProps<Theme> }) {
    const retentionDays = useTaskLogRetentionDays();
    return (
        <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", color: "text.secondary", ...sx }}>
            <InfoOutlinedIcon fontSize="small" sx={{ mt: "1px" }} />
            <Typography variant="body2">
                {retentionDays !== null && `${taskLogRetentionNote(retentionDays)} `}{EXPORT_ARCHIVE_RETENTION_NOTE}
            </Typography>
        </Stack>
    );
}
