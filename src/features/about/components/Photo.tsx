import { useState } from "react";
import { Box } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";

interface PhotoProps {
    src: string;
    alt: string;
    /** Extra styles merged after the defaults (size, radius, …). */
    sx?: SxProps<Theme>;
}

/**
 * An illustration of the About page.
 *
 * The photos are static files under `public/about/`; while one is missing the
 * slot keeps its size and shows a quiet placeholder instead of the browser's
 * broken-image icon, so the layout can be worked on before every picture is in.
 */
export default function Photo({ src, alt, sx }: PhotoProps) {
    const [missing, setMissing] = useState(false);

    if (missing) {
        return (
            <Box
                role="img"
                aria-label={alt}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    color: "text.disabled",
                    bgcolor: "grey.100",
                    ...sx,
                }}
            >
                <ImageOutlinedIcon sx={{ fontSize: 40 }} />
            </Box>
        );
    }

    return (
        <Box
            component="img"
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setMissing(true)}
            sx={{ display: "block", width: "100%", objectFit: "cover", ...sx }}
        />
    );
}
