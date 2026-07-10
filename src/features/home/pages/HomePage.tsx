import { Box, Container, Stack, Typography } from "@mui/material";
import ScatterPlotIcon from "@mui/icons-material/ScatterPlot";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import HubIcon from "@mui/icons-material/Hub";
import MainLayout from "@/app/layouts/MainLayout";
import ParticleField from "../components/ParticleField";

/** Short, truthful entry points that mirror the app's real sections. */
const HIGHLIGHTS = [
    {
        icon: ScatterPlotIcon,
        title: "Explore",
        description:
            "Visualize particle size distributions and concentration profiles across the water column.",
    },
    {
        icon: WorkspacesIcon,
        title: "Manage projects",
        description:
            "Organize your datasets, imports, and processing tasks inside structured projects.",
    },
    {
        icon: HubIcon,
        title: "Connect EcoTaxa",
        description:
            "Link your EcoTaxa account to pair particle data with plankton classification.",
    },
];

export default function HomePage() {
    return (
        <MainLayout>
            {/* Full-bleed hero: break out of MainLayout's padding so the
                interactive particle field runs edge-to-edge under the TopBar. */}
            <Box
                sx={{
                    position: "relative",
                    mx: -3,
                    mt: -3,
                    mb: -3,
                    minHeight: "calc(100vh - 64px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    // Subtle teal atmosphere behind the particles.
                    background: (t) =>
                        `radial-gradient(120% 120% at 50% 0%, ${t.palette.primary.light}14 0%, ${t.palette.background.default} 60%)`,
                }}
            >
                <ParticleField />

                <Container
                    maxWidth="md"
                    sx={{ position: "relative", zIndex: 1, py: 8 }}
                >
                    <Stack spacing={{ xs: 5, md: 7 }} alignItems="center">
                        {/* Hero copy */}
                        <Stack spacing={2.5} alignItems="center">
                            <Typography
                                variant="overline"
                                sx={{
                                    color: "primary.main",
                                    fontWeight: 700,
                                    letterSpacing: "0.18em",
                                }}
                            >
                                EcoPart
                            </Typography>

                            <Typography
                                variant="h2"
                                textAlign="center"
                                sx={{
                                    fontWeight: 700,
                                    letterSpacing: "-0.02em",
                                    lineHeight: 1.1,
                                    fontSize: {
                                        xs: "2.5rem",
                                        sm: "3.25rem",
                                        md: "3.75rem",
                                    },
                                }}
                            >
                                Millions of particles.
                                <br />
                                One clear picture.
                            </Typography>

                            <Typography
                                variant="h6"
                                textAlign="center"
                                color="text.secondary"
                                sx={{ maxWidth: 620, fontWeight: 400 }}
                            >
                                EcoPart brings marine particle and plankton
                                imaging data together in one place, ready to
                                explore, organize, and share.
                            </Typography>
                        </Stack>

                        {/* Feature highlights */}
                        <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={{ xs: 3, sm: 4 }}
                            sx={{ width: "100%", maxWidth: 780 }}
                        >
                            {HIGHLIGHTS.map(
                                ({ icon: Icon, title, description }) => (
                                    <Stack
                                        key={title}
                                        spacing={1}
                                        sx={{ flex: 1 }}
                                    >
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                        >
                                            <Icon
                                                fontSize="small"
                                                sx={{ color: "primary.main" }}
                                            />
                                            <Typography
                                                variant="subtitle1"
                                                sx={{ fontWeight: 700 }}
                                            >
                                                {title}
                                            </Typography>
                                        </Stack>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            {description}
                                        </Typography>
                                    </Stack>
                                ),
                            )}
                        </Stack>
                    </Stack>
                </Container>
            </Box>
        </MainLayout>
    );
}
