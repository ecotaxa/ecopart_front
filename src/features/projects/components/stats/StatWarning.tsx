import { Stack, Tooltip, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

interface StatWarningProps {
    /** Short, shown in capitals ("MISSING 1 CTD FILE"). */
    label: string;
    /** What the warning means, as a tooltip. */
    hint?: string;
}

/** An orange warning of a STATS section: an icon and a short capitalised label. */
export default function StatWarning({ label, hint }: StatWarningProps) {
    const content = (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "warning.main" }} role="status">
            <WarningAmberIcon fontSize="small" aria-hidden="true" />
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>
                {label}
            </Typography>
        </Stack>
    );
    return hint ? <Tooltip title={hint}>{content}</Tooltip> : content;
}

/** The warnings of a section, laid out on the right of its title. */
export function StatWarnings({ children }: { children: React.ReactNode }) {
    return (
        <Stack direction="row" sx={{ flexWrap: "wrap", columnGap: 2, rowGap: 0.5, justifyContent: "flex-end" }}>
            {children}
        </Stack>
    );
}
