import { Link, Stack, Tooltip, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

interface StatWarningProps {
    /** Short, shown in capitals ("MISSING 1 CTD FILE"). */
    label: string;
    /** What the warning means, as a tooltip. */
    hint?: string;
    /** Where to act on it, in the app (a tab of the project). */
    to?: string;
    /** Where to act on it, outside the app (the EcoTaxa project), opened in a new tab. */
    href?: string;
}

const labelSx = { fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 } as const;

/** An orange warning of a STATS section: an icon and a short capitalised label, a link when an action exists. */
export default function StatWarning({ label, hint, to, href }: StatWarningProps) {
    const text = to
        ? <Link component={RouterLink} to={to} variant="caption" color="inherit" underline="hover" sx={labelSx}>{label}</Link>
        : href
            ? <Link href={href} target="_blank" rel="noopener noreferrer" variant="caption" color="inherit" underline="hover" sx={labelSx}>{label}</Link>
            : <Typography variant="caption" sx={labelSx}>{label}</Typography>;
    const content = (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "warning.main" }} role="status">
            <WarningAmberIcon fontSize="small" aria-hidden="true" />
            {text}
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
