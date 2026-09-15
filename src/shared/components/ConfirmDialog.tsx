import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from "@mui/material";

import { useConfirmStore } from "@/shared/confirm/confirm.store";

/**
 * Renders the pending `confirmDialog()` request as a MUI dialog. Mounted once
 * in the app providers (and in the test renderer), so every screen shares the
 * same look and keyboard behaviour instead of falling back to `window.confirm`.
 */
export default function ConfirmDialogHost() {
    const pending = useConfirmStore((s) => s.pending);

    if (!pending) return null;

    const { title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", severity = "error", resolve } = pending;

    return (
        <Dialog
            open
            onClose={() => resolve(false)}
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
            <DialogContent>
                <DialogContentText id="confirm-dialog-description" component="div">
                    {message}
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => resolve(false)} color="inherit" autoFocus>
                    {cancelLabel}
                </Button>
                <Button onClick={() => resolve(true)} variant="contained" color={severity}>
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
