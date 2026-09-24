import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

/**
 * Body of a destructive `confirmDialog()`: a "Warning" header (icon + bold text
 * in the warning colour) followed by the description of what will be deleted.
 */
export const ConfirmWarningMessage = ({ children }: { children: ReactNode }) => (
    <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, color: "warning.main" }}>
            <WarningAmberIcon />
            <Typography fontWeight="bold">Warning</Typography>
        </Stack>
        <Typography>{children}</Typography>
    </Box>
);
