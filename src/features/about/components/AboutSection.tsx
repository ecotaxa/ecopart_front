import type { ReactNode } from "react";
import { Box, Container } from "@mui/material";
import type { Breakpoint } from "@mui/material/styles";

interface AboutSectionProps {
    children: ReactNode;
    /** Anchor id, so a link can jump straight to the section. */
    id?: string;
    /** Paint the band on the page grey instead of white, to alternate with its neighbours. */
    tinted?: boolean;
    maxWidth?: Breakpoint;
}

/**
 * One full-width band of the About page: an edge-to-edge background with the
 * content held in a centered container. Sections alternate `tinted` so the
 * eye separates them without borders.
 */
export default function AboutSection({ children, id, tinted = false, maxWidth = "lg" }: AboutSectionProps) {
    return (
        <Box
            component="section"
            id={id}
            sx={{
                bgcolor: tinted ? "background.default" : "background.paper",
                py: { xs: 6, md: 8 },
            }}
        >
            <Container maxWidth={maxWidth}>{children}</Container>
        </Box>
    );
}
