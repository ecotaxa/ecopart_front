import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";

import Photo from "./Photo";

interface ImageTextSectionProps {
    image: { src: string; alt: string };
    title: string;
    /** Body copy: one `<Typography>` per paragraph. */
    children: ReactNode;
    /** Which side the photo takes on wide screens; it always comes first on narrow ones. */
    imageSide?: "left" | "right";
}

/**
 * A photo beside a titled block of copy, half and half on wide screens and
 * stacked (photo first) on narrow ones.
 */
export default function ImageTextSection({ image, title, children, imageSide = "left" }: ImageTextSectionProps) {
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                alignItems: "center",
                gap: { xs: 4, md: 8 },
            }}
        >
            <Photo
                src={image.src}
                alt={image.alt}
                sx={{
                    aspectRatio: "16 / 9",
                    borderRadius: 2,
                    order: { md: imageSide === "right" ? 1 : 0 },
                }}
            />

            <Stack spacing={2}>
                <Typography variant="h4" component="h2">
                    {title}
                </Typography>
                {children}
            </Stack>
        </Box>
    );
}
