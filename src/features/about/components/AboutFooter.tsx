import { Box, Container, Link, Stack, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import { ABOUT_LINKS, DEVELOPERS } from "../content";

/** Closing band: hosting disclaimer, contact address and credits. */
export default function AboutFooter() {
    return (
        <Box component="footer" sx={{ bgcolor: "background.default", borderTop: 1, borderColor: "divider", py: 4 }}>
            <Container maxWidth="lg">
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 3 }}>
                    <WarningAmberIcon fontSize="small" sx={{ color: "warning.main", flexShrink: 0 }} />
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                        The managers of EcoPart are not responsible for the safekeeping of the data it hosts, even if
                        they make their best to keep the application stable and secure.
                    </Typography>
                </Stack>

                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                >
                    <Typography variant="body2" color="text.secondary">
                        A question:{" "}
                        <Link href={`mailto:${ABOUT_LINKS.contactEmail}`}>{ABOUT_LINKS.contactEmail}</Link>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Developed by: {DEVELOPERS.join(" & ")}
                    </Typography>
                </Stack>
            </Container>
        </Box>
    );
}
