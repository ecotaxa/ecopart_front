import { Box, Typography } from "@mui/material";

import AboutHero from "../components/AboutHero";
import AboutSection from "../components/AboutSection";
import ImageTextSection from "../components/ImageTextSection";
import PartnersSection from "../components/PartnersSection";
import InstrumentsSection from "../components/InstrumentsSection";
import FeaturesSection from "../components/FeaturesSection";
import AboutFooter from "../components/AboutFooter";

/**
 * The public "About EcoPart" page: what the platform is for, who funds it,
 * which instruments it supports and what it offers on top of hosting data.
 */
export default function AboutPage() {
    return (
        // Break out of MainLayout's padding (same trick as HomePage) so every
        // band and the hero run edge to edge under the TopBar.
        <Box sx={{ mx: -3, mt: -3, mb: -3 }}>
            <AboutHero />

            <AboutSection>
                <ImageTextSection
                    image={{ src: "/about/boat.jpg", alt: "Research vessel deploying an instrument at sea" }}
                    title="Create, check and share your data"
                >
                    <Typography color="text.secondary">
                        EcoPart is designed to host measurements of particles recorded by versions 5 and 6 of the{" "}
                        <strong>Underwater Vision Profiler</strong> (UVP).
                    </Typography>
                    <Typography color="text.secondary">
                        In addition to your UVP records, you can associate <strong>CTD</strong> data and import the UVP{" "}
                        <strong>vignettes</strong> into EcoTaxa for classification.
                    </Typography>
                    <Typography color="text.secondary">
                        Furthermore, EcoPart provides tools to help you assess the{" "}
                        <strong>quality of your data</strong>.
                    </Typography>
                </ImageTextSection>
            </AboutSection>

            <AboutSection tinted>
                <ImageTextSection
                    image={{ src: "/about/conference.jpg", alt: "Scientists attending a conference session" }}
                    title="Explore, share and export aggregated dataset"
                    imageSide="right"
                >
                    <Typography color="text.secondary">
                        <strong>Filter</strong> and <strong>visualize</strong> datasets across all accessible data to
                        find what you need.
                    </Typography>
                    <Typography color="text.secondary">
                        <strong>Generate</strong> multiple plots on the fly from selected particle datasets.
                    </Typography>
                    <Typography color="text.secondary">
                        <strong>Export</strong> particles, CTD, and image classification datasets.
                    </Typography>
                    <Typography color="text.secondary">
                        <strong>Promote</strong> your data through this globally accessible database.
                    </Typography>
                </ImageTextSection>
            </AboutSection>

            <PartnersSection />
            <InstrumentsSection />
            <FeaturesSection />
            <AboutFooter />
        </Box>
    );
}
