import { Box, Link, Stack, Typography } from "@mui/material";

import AboutSection from "./AboutSection";
import { CITATION, PARTNERS } from "../content";

/** Funding institutions and projects, with the reference to cite in return. */
export default function PartnersSection() {
    return (
        <AboutSection id="partners">
            <Stack spacing={3} alignItems="center" textAlign="center">
                <Typography variant="h3" component="h2" sx={{ fontWeight: 500 }}>
                    Institutions and projects that make it possible
                </Typography>

                <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
                    The maintenance of the software and hardware that allows EcoPart to run depends on the support
                    from its users. We would very much appreciate if you could consider setting aside some funds in
                    your next grant for this. Contact us to estimate what would be both reasonable and useful.
                </Typography>
            </Stack>

            <Box
                component="ul"
                sx={{
                    listStyle: "none",
                    m: 0,
                    mt: 5,
                    p: 0,
                    display: "grid",
                    gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" },
                    gap: { xs: 3, md: 4 },
                }}
            >
                {PARTNERS.map(({ name, logo }) => (
                    <Box
                        component="li"
                        key={name}
                        sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 96 }}
                    >
                        <Box
                            component="img"
                            src={logo}
                            alt={name}
                            loading="lazy"
                            sx={{ maxHeight: 80, maxWidth: "min(100%, 200px)", objectFit: "contain" }}
                        />
                    </Box>
                ))}
            </Box>

            <Stack spacing={1.5} sx={{ mt: 6 }}>
                <Typography variant="body2">
                    If you use EcoTaxa or EcoPart in your work, we would appreciate that you cite it as:
                </Typography>
                <Typography
                    component="blockquote"
                    variant="body2"
                    sx={{ m: 0, pl: 2, borderLeft: 3, borderColor: "primary.main", fontWeight: 600 }}
                >
                    {CITATION.authors}
                    <br />
                    {CITATION.title}:{" "}
                    <Link href={CITATION.url} target="_blank" rel="noopener noreferrer">
                        {CITATION.url}
                    </Link>
                </Typography>
            </Stack>
        </AboutSection>
    );
}
