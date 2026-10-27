import { Backdrop, CircularProgress, Stack, Typography } from "@mui/material";

/**
 * Greys out the whole page (app bar and drawer included) while a blocking
 * operation runs, so nothing can be clicked until it is over. MUI hides a
 * Backdrop from assistive technology by default: undone here so the message is
 * announced.
 */
export const BusyOverlay = ({ open, message }: { open: boolean; message: string }) => (
    <Backdrop
        open={open}
        slotProps={{ root: { "aria-hidden": false } }}
        sx={{ color: "common.white", zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
        <Stack alignItems="center" spacing={2} role="status" aria-live="polite">
            <CircularProgress color="inherit" aria-hidden />
            <Typography variant="h6">{message}</Typography>
        </Stack>
    </Backdrop>
);
