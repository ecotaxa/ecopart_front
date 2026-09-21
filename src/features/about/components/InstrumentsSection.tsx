import { Box, Link, Stack, Typography } from "@mui/material";

import AboutSection from "./AboutSection";
import Photo from "./Photo";
import { ABOUT_LINKS, INSTRUMENTS } from "../content";

const MANUALS = [
    { label: "Instrument manuals", href: ABOUT_LINKS.piqvInstrumentManuals },
    { label: "Software manuals", href: ABOUT_LINKS.piqvSoftwareManuals },
];

/** The UVP models whose data EcoPart hosts, and where their documentation lives. */
export default function InstrumentsSection() {
    return (
        <AboutSection id="instruments" tinted>
            <Typography variant="h3" component="h2" sx={{ fontWeight: 500, mb: 5 }}>
                Data from multiple sources
            </Typography>

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    columnGap: 6,
                    rowGap: 5,
                }}
            >
                {INSTRUMENTS.map(({ name, image, description, learnMoreUrl }) => (
                    <Stack key={name} spacing={1.5} alignItems="flex-start">
                        <Photo
                            src={image}
                            alt={name}
                            sx={{ width: 64, height: 64, borderRadius: "50%", flexShrink: 0 }}
                        />
                        <Typography variant="h5" component="h3">
                            {name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {description}
                        </Typography>
                        <Link
                            href={learnMoreUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="body2"
                            fontWeight={600}
                        >
                            Learn more in BODC
                        </Link>
                    </Stack>
                ))}
            </Box>

            <Typography variant="body2" sx={{ mt: 6 }}>
                You can find related manuals and documentation on the PIQv website:
            </Typography>
            <Box component="ul" sx={{ m: 0, mt: 1, pl: 3 }}>
                {MANUALS.map(({ label, href }) => (
                    <li key={label}>
                        <Link href={href} target="_blank" rel="noopener noreferrer" variant="body2" fontWeight={600}>
                            {label}
                        </Link>
                    </li>
                ))}
            </Box>
        </AboutSection>
    );
}
