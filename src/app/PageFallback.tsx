import { Box, CircularProgress } from "@mui/material";

/** Shown while a lazily-loaded page chunk downloads (see `app/router.tsx`). */
export function PageFallback() {
    return (
        <Box sx={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress />
        </Box>
    );
}
