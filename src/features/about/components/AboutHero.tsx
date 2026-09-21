import { Box, Button, Container, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import ParticleField from "@/shared/components/ParticleField";
import { ecotaxaColors } from "@/theme";

const { secondblue, mainblue } = ecotaxaColors;

/**
 * Full-bleed dark banner opening the About page: the particle field of the
 * landing page, drawn over deep water instead of the light page background,
 * with the page title and the call to action toward the data.
 */
export default function AboutHero() {
    return (
        <Box
            sx={{
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: { xs: 300, md: 400 },
                color: "common.white",
                background: `linear-gradient(160deg, ${secondblue[900]} 0%, ${mainblue[800]} 55%, ${secondblue[700]} 100%)`,
            }}
        >
            <ParticleField tone="dark" />

            <Container maxWidth="md" sx={{ position: "relative", zIndex: 1, py: 8, textAlign: "center" }}>
                <Typography
                    component="h1"
                    variant="h2"
                    sx={{
                        fontWeight: 500,
                        letterSpacing: "0.02em",
                        fontSize: { xs: "2.25rem", md: "3rem" },
                        mb: 3,
                    }}
                >
                    About EcoPart
                </Typography>

                <Button
                    component={RouterLink}
                    to="/explore"
                    variant="outlined"
                    size="large"
                    sx={{
                        color: "common.white",
                        borderColor: "rgba(255, 255, 255, 0.6)",
                        "&:hover": {
                            borderColor: "common.white",
                            backgroundColor: "rgba(255, 255, 255, 0.08)",
                        },
                    }}
                >
                    Explore data
                </Button>
            </Container>
        </Box>
    );
}
