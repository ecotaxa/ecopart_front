import { Box, Link, Stack, Typography } from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";

import AboutSection from "./AboutSection";
import { FEATURES } from "../content";

/** What EcoPart offers on top of hosting the data: API, EcoTaxa, quality control, exports. */
export default function FeaturesSection() {
    return (
        <AboutSection id="features">
            <Typography variant="h3" component="h2" sx={{ fontWeight: 500, mb: 5 }}>
                An easy way to handle your UVP data
            </Typography>

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    columnGap: 6,
                    rowGap: 5,
                }}
            >
                {FEATURES.map(({ title, href, description }) => (
                    <Stack key={title} spacing={1.5}>
                        <Typography variant="h5" component="h3">
                            {href ? (
                                // Outside destination (API docs, EcoTaxa): the title itself is
                                // the link, the icon tells it apart from a plain heading.
                                <Link
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    color="inherit"
                                    sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}
                                >
                                    {title}
                                    <LinkIcon fontSize="small" sx={{ color: "primary.main" }} />
                                </Link>
                            ) : (
                                title
                            )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {description}
                        </Typography>
                    </Stack>
                ))}
            </Box>
        </AboutSection>
    );
}
